// Location: src/WandleWheelhouse.Api/Program.cs
using System.Text.Json.Serialization; // Required for JsonStringEnumConverter
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection; // For Data Protection
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.IO;
using System.Reflection;
using System.Text;
using WandleWheelhouse.Api.Data;
using WandleWheelhouse.Api.Data.Seed;     // For IdentityDataSeeder
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.Services;
using WandleWheelhouse.Api.SwaggerFilters;
using WandleWheelhouse.Api.UnitOfWork;
using WandleWheelhouse.Api.Configuration;

try
{
    var builder = WebApplication.CreateBuilder(args);
    var isDevelopment = builder.Environment.IsDevelopment();

    // --- Use Default ASP.NET Core Logging ---
    // No NLog setup; use the default console logger
    builder.Logging.SetMinimumLevel(Microsoft.Extensions.Logging.LogLevel.Information);

    // --- 1. Configure Services ---

    // Database Context Configuration
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found in configuration. Ensure it's set (e.g., in .env for Docker or appsettings/user secrets for local non-Docker).");

    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseNpgsql(connectionString, npgsqlOptionsAction: sqlOptions =>
        {
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorCodesToAdd: null); // Use default PostgreSQL error codes for retries
        }));

    // Email Sender Registration
    if (isDevelopment)
    {
        builder.Services.AddSingleton<IEmailSender, DummyEmailSender>();
    }
    else
    {
        // TODO: Replace with a real email sender service for production
        builder.Services.AddSingleton<IEmailSender, DummyEmailSender>();
    }

    // Identity Configuration
    builder.Services.AddIdentity<User, IdentityRole>(options =>
    {
        options.Password.RequireDigit = true;
        options.Password.RequiredLength = 8;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.Password.RequiredUniqueChars = 1;

        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.AllowedForNewUsers = true;

        options.User.RequireUniqueEmail = true;
        options.SignIn.RequireConfirmedAccount = false;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

    // JWT Authentication Configuration
    var jwtSettings = builder.Configuration.GetSection("Jwt");
    var secretKeyString = jwtSettings["Key"]
        ?? throw new InvalidOperationException("JWT Key ('Jwt:Key') is missing in configuration. Ensure it's set via environment variables (e.g., JWT_KEY in .env for Docker Compose) or user secrets for local development.");

    if (Encoding.ASCII.GetBytes(secretKeyString).Length < 32)
    {
        Console.WriteLine(
            "CRITICAL SECURITY WARNING: JWT Key ('Jwt:Key') is less than 32 bytes (256 bits). " +
            "This is INSECURE and MUST be changed for any non-trivial development or production environment. " +
            "Current Key (partial for safety): '{0}...'",
            secretKeyString.Substring(0, Math.Min(secretKeyString.Length, 5))
        );
        if (!isDevelopment)
        {
            throw new InvalidOperationException("PRODUCTION ERROR: JWT Key ('Jwt:Key') must be at least 256 bits (e.g., 32 ASCII characters if using HS256).");
        }
    }
    var secretKey = Encoding.ASCII.GetBytes(secretKeyString);

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.SaveToken = true;
        options.RequireHttpsMetadata = !isDevelopment;
        options.TokenValidationParameters = new TokenValidationParameters()
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(secretKey),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

    // Authorization (Role Policies)
    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("RequireAdministratorRole", policy => policy.RequireRole("Administrator"));
        options.AddPolicy("RequireEditorRole", policy => policy.RequireRole("Administrator", "Editor"));
        options.AddPolicy("RequireMemberRole", policy => policy.RequireRole("Administrator", "Editor", "Member"));
    });

    // CORS Configuration
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowWebApp", policyBuilder =>
        {
            List<string> allowedOrigins = new List<string>();

            var piIp = builder.Configuration.GetValue<string>("PiSettings:LocalIp", "192.168.1.166");
            var piClientPort = builder.Configuration.GetValue<int>("PiSettings:ClientPort", 5000);
            var piApiPort = builder.Configuration.GetValue<int>("PiSettings:ApiPort", 5001);
            var duckDNSDomain = builder.Configuration.GetValue<string>("PiSettings:DuckDNSDomain", "wandlewheelhouse.duckdns.org");

            if (isDevelopment)
            {
                allowedOrigins.AddRange(new[] {
                    "http://localhost:5174", "http://127.0.0.1:5174",
                    "http://localhost:5173", "http://127.0.0.1:5173",
                    "http://localhost:8080", "http://127.0.0.1:8080",
                    $"http://{piIp}:{piClientPort}",
                    $"http://{duckDNSDomain}:{piClientPort}",
                    $"https://{duckDNSDomain}",
                    $"https://localhost:{builder.Configuration.GetValue<int>("KestrelHttpsPort", 7136)}",
                    $"http://localhost:{builder.Configuration.GetValue<int>("KestrelHttpPort", 5041)}",
                    $"http://{piIp}:{piApiPort}"
                });
            }
            else
            {
                allowedOrigins.Add($"https://{duckDNSDomain}");
                var additionalProdOrigins = builder.Configuration.GetSection("CORS:AllowedProductionOrigins").Get<string[]>();
                if (additionalProdOrigins != null)
                {
                    allowedOrigins.AddRange(additionalProdOrigins.Where(o => !string.IsNullOrWhiteSpace(o) && Uri.TryCreate(o, UriKind.Absolute, out _)));
                }
            }

            allowedOrigins = allowedOrigins.Where(o => !string.IsNullOrWhiteSpace(o)).Distinct().ToList();

            if (allowedOrigins.Any())
            {
                Console.WriteLine("CORS Policy 'AllowWebApp' allowing origins: {0}", string.Join(", ", allowedOrigins));
                policyBuilder.WithOrigins(allowedOrigins.ToArray())
                             .AllowAnyHeader()
                             .AllowAnyMethod()
                             .AllowCredentials();
            }
            else
            {
                Console.WriteLine("CRITICAL: No CORS origins specified for 'AllowWebApp' policy in environment: {0}. API will likely be inaccessible from the intended frontends.", builder.Environment.EnvironmentName);
            }
        });
    });

    builder.Services.AddControllers()
     .AddJsonOptions(options =>
    {
        // This will serialize and deserialize ALL enums as strings
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        // Optional: if you want camelCase for your enum strings in JSON (e.g., "stripe" instead of "Stripe")
        // options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(System.Text.Json.JsonNamingPolicy.CamelCase));
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull; // Optional: omits null properties from JSON
    });
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        options.SwaggerDoc("v1", new OpenApiInfo { Title = "Wandle Wheelhouse API", Version = "v1" });
        options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
            Name = "Authorization",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT"
        });
        options.AddSecurityRequirement(new OpenApiSecurityRequirement {
        {
            new OpenApiSecurityScheme {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            }, new string[] {}
        }});
        try
        {
            var xmlFilename = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFilename);
            if (File.Exists(xmlPath))
            {
                options.IncludeXmlComments(xmlPath);
                Console.WriteLine("XML comments for Swagger loaded from: {0}", xmlPath);
            }
            else
            {
                Console.WriteLine("Swagger XML comment file NOT found at: {0}", xmlPath);
            }
        }
        catch (Exception ex) { Console.WriteLine("Error loading XML comments for Swagger: {0}", ex.Message); }
        options.OperationFilter<FileUploadOperationFilter>();
    });

    builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
    builder.Services.AddScoped<IPaymentService, StripePaymentService>();
    builder.Services.Configure<StripeSettings>(builder.Configuration.GetSection("Stripe"));



    // Configure Data Protection to Persist Keys
    var dpKeysPathFromConfig = builder.Configuration.GetValue<string>("DataProtection:KeysPath");
    var dataProtectionKeysFolder = dpKeysPathFromConfig;

    if (string.IsNullOrWhiteSpace(dataProtectionKeysFolder))
    {
        dataProtectionKeysFolder = Path.Combine(builder.Environment.ContentRootPath, "DataProtection-Keys-LocalFallback");
        Console.WriteLine("DataProtection:KeysPath configuration not found or is empty. Using fallback local path: {0}", dataProtectionKeysFolder);
    }

    var fullKeysPath = Path.IsPathRooted(dataProtectionKeysFolder)
        ? dataProtectionKeysFolder
        : Path.Combine(builder.Environment.ContentRootPath, dataProtectionKeysFolder);

    try
    {
        if (!Directory.Exists(fullKeysPath))
        {
            Directory.CreateDirectory(fullKeysPath);
            Console.WriteLine("Created Data Protection keys directory at: {0}", fullKeysPath);
        }

        builder.Services.AddDataProtection()
            .PersistKeysToFileSystem(new DirectoryInfo(fullKeysPath))
            .SetApplicationName("WandleWheelhouseApp");
        Console.WriteLine("Data Protection keys configured to persist to: {0}", fullKeysPath);
    }
    catch (Exception ex)
    {
        Console.WriteLine("Failed to configure Data Protection key persistence at {0}. Keys may not persist, and EF migrations may fail: {1}", fullKeysPath, ex.Message);
        throw;
    }

    // --- 2. Configure HTTP Request Pipeline ---
    var app = builder.Build();

    app.Logger.LogInformation("Application starting up. Environment: {EnvironmentName}", app.Environment.EnvironmentName);
    app.Logger.LogInformation("Data Protection keys target path: {EffectiveDpKeysPath}", dataProtectionKeysFolder);

    if (app.Configuration.GetValue<bool>("ApplyMigrationsAndSeedOnStartup", isDevelopment))
    {
        app.Logger.LogInformation("ApplyMigrationsAndSeedOnStartup: Checking for database actions...");
        using (var scope = app.Services.CreateScope())
        {
            var services = scope.ServiceProvider;
            var dbContext = services.GetRequiredService<ApplicationDbContext>();
            var appConfig = services.GetRequiredService<IConfiguration>();
            var appSpecificLogger = services.GetRequiredService<ILogger<Program>>();

            try
            {
                var pendingMigrations = await dbContext.Database.GetPendingMigrationsAsync();
                if (pendingMigrations.Any())
                {
                    appSpecificLogger.LogInformation("Applying pending database migrations: {Migrations}", string.Join(", ", pendingMigrations));
                    await dbContext.Database.MigrateAsync();
                    appSpecificLogger.LogInformation("Database migrations applied successfully.");
                }
                else
                {
                    appSpecificLogger.LogInformation("No pending database migrations to apply.");
                }

                appSpecificLogger.LogInformation("Attempting to seed initial identity data...");
                await IdentityDataSeeder.Initialize(services, appConfig, appSpecificLogger);
                appSpecificLogger.LogInformation("Identity data seeding process completed.");
            }
            catch (Exception ex)
            {
                appSpecificLogger.LogCritical(ex, "ApplyMigrationsAndSeedOnStartup: An error occurred while migrating or seeding the database. Application startup will be halted.");
                throw;
            }
        }
    }

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Wandle Wheelhouse API V1");
            c.EnablePersistAuthorization();
        });
        app.UseDeveloperExceptionPage();
    }
    else
    {
        app.UseExceptionHandler(appBuilder =>
        {
            appBuilder.Run(async context =>
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                var exceptionHandlerPathFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
                var error = exceptionHandlerPathFeature?.Error;
                app.Logger.LogError(error, "Unhandled exception caught by global error handler for path {Path}", exceptionHandlerPathFeature?.Path);
                await context.Response.WriteAsync("An unexpected server error occurred. Please try again later.");
            });
        });
        app.UseHsts();
    }

    var uploadsPath = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"), "uploads");
    if (!Directory.Exists(uploadsPath) && isDevelopment)
    {
        try { Directory.CreateDirectory(uploadsPath); app.Logger.LogInformation("Created directory for uploads: {UploadsPath}", uploadsPath); }
        catch (Exception ex) { app.Logger.LogError(ex, "Failed to create directory for uploads: {UploadsPath}", uploadsPath); }
    }
    if (Directory.Exists(uploadsPath))
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(uploadsPath),
            RequestPath = "/uploads"
        });
        app.Logger.LogInformation("Static files from {UploadsPath} will be served at /uploads", uploadsPath);
    }
    else
    {
        app.Logger.LogWarning("Uploads directory not found at {UploadsPath}. Uploaded files may not be accessible.", uploadsPath);
    }

    app.UseRouting();
    app.UseCors("AllowWebApp");

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();

    app.Logger.LogInformation("Wandle Wheelhouse API starting up...");
    app.Run();
}
catch (Exception exception)
{
    Console.WriteLine("Program stopped due to an unhandled exception during startup or shutdown: {0}", exception.Message);
    throw;
}