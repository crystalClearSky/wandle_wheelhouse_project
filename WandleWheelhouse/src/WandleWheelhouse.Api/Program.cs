// Location: src/WandleWheelhouse.Api/Program.cs

// --- NLog Using Statements ---
using NLog;
using NLog.Web;
// --- End NLog Using Statements ---

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
// using WandleWheelhouse.Api.Middleware; // For VisitorTrackingMiddleware (currently commented out by user)
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.Services;
using WandleWheelhouse.Api.SwaggerFilters;
using WandleWheelhouse.Api.UnitOfWork;

// --- NLog: Early Initialization ---
// Setup NLog for dependency injection and catch setup errors
// This loads nlog.config or appsettings.json NLog configuration by default
var nlogLogger = NLog.LogManager.Setup().LoadConfigurationFromAppSettings().GetCurrentClassLogger();
nlogLogger.Debug("NLog initialized for application startup. NLog Version: {NLogVersion}", typeof(NLog.LogFactory).Assembly.GetName().Version);

try
{
    var builder = WebApplication.CreateBuilder(args);
    var isDevelopment = builder.Environment.IsDevelopment();

    // --- NLog: Configure ASP.NET Core to use NLog ---
    builder.Logging.ClearProviders(); // Clear existing default providers like Console, Debug
    builder.Logging.SetMinimumLevel(Microsoft.Extensions.Logging.LogLevel.Trace); // Let NLog rules control final log level
    builder.Host.UseNLog();  // Use NLog for all ASP.NET Core logging
    // --- End NLog Configuration ---

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
        options.Password.RequiredLength = 8; // Consider increasing for better security
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true; // Recommended
        options.Password.RequiredUniqueChars = 1;

        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.AllowedForNewUsers = true;

        options.User.RequireUniqueEmail = true;
        options.SignIn.RequireConfirmedAccount = false; // Set to true if you implement email confirmation
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

    // JWT Authentication Configuration
    var jwtSettings = builder.Configuration.GetSection("Jwt");
    var secretKeyString = jwtSettings["Key"]
        ?? throw new InvalidOperationException("JWT Key ('Jwt:Key') is missing in configuration. Ensure it's set via environment variables (e.g., JWT_KEY in .env for Docker Compose) or user secrets for local development.");

    // Validate key length (example for HMACSHA256 which needs at least 256 bits / 32 UTF-8 bytes)
    if (Encoding.ASCII.GetBytes(secretKeyString).Length < 32)
    {
        nlogLogger.Warn( // Use the NLog instance initialized at the top
            "CRITICAL SECURITY WARNING: JWT Key ('Jwt:Key') is less than 32 bytes (256 bits). " +
            "This is INSECURE and MUST be changed for any non-trivial development or production environment. " +
            "Current Key (partial for safety): '{PartialKey}...'",
            secretKeyString.Substring(0, Math.Min(secretKeyString.Length, 5))
        );
        if (!isDevelopment) // Stricter check for production
        {
            // In production, you should absolutely throw an error if the key is weak.
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
        options.RequireHttpsMetadata = !isDevelopment; // Enforce HTTPS in production for token exchange
        options.TokenValidationParameters = new TokenValidationParameters()
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(secretKey),
            ClockSkew = TimeSpan.FromMinutes(1) // Default is 5 mins, 0-1 min is common for stricter checks
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
            var corsNlogLogger = LogManager.GetLogger("CORS_Policy_Setup"); // Specific NLog logger for CORS
            List<string> allowedOrigins = new List<string>();

            // Configuration keys for Pi access details (can be set in appsettings.Development.json or .env)
            var piIp = builder.Configuration.GetValue<string>("PiSettings:LocalIp", "192.168.1.166"); // Example default
            var piClientPort = builder.Configuration.GetValue<int>("PiSettings:ClientPort", 5000);
            var piApiPort = builder.Configuration.GetValue<int>("PiSettings:ApiPort", 5001);
            var duckDNSDomain = builder.Configuration.GetValue<string>("PiSettings:DuckDNSDomain", "yoursubdomain.duckdns.org"); // Example

            if (isDevelopment)
            {
                allowedOrigins.AddRange(new[] {
                    "http://localhost:5174", "http://127.0.0.1:5174", // Local Vite dev (Windows)
                    "http://localhost:5173", "http://127.0.0.1:5173", // Alternative local Vite (Windows)
                    "http://localhost:8080", "http://127.0.0.1:8080", // Local Docker client (Windows)
                    $"http://{piIp}:{piClientPort}",                   // Client on Pi via IP:Port (HTTP)
                    $"http://{duckDNSDomain}:{piClientPort}",          // Client on Pi via DuckDNS HTTP + Port (before NPM does HTTPS redirect)
                    $"https://{duckDNSDomain}",                        // Client on Pi via DuckDNS HTTPS (after NPM SSL)
                    // Swagger origins
                    $"https://localhost:{builder.Configuration.GetValue<int>("KestrelHttpsPort", 7136)}", // Kestrel local HTTPS
                    $"http://localhost:{builder.Configuration.GetValue<int>("KestrelHttpPort", 5041)}",   // Kestrel local HTTP
                    $"http://{piIp}:{piApiPort}"                       // Swagger on Pi API port (HTTP)
                });
            }
            else // Production or non-Development
            {
                allowedOrigins.Add($"https://{duckDNSDomain}"); // Primary production origin via HTTPS
                var additionalProdOrigins = builder.Configuration.GetSection("CORS:AllowedProductionOrigins").Get<string[]>();
                if (additionalProdOrigins != null)
                {
                    allowedOrigins.AddRange(additionalProdOrigins.Where(o => !string.IsNullOrWhiteSpace(o) && Uri.TryCreate(o, UriKind.Absolute, out _)));
                }
            }

            allowedOrigins = allowedOrigins.Where(o => !string.IsNullOrWhiteSpace(o)).Distinct().ToList();

            if (allowedOrigins.Any())
            {
                corsNlogLogger.Info("CORS Policy 'AllowWebApp' allowing origins: {Origins}", string.Join(", ", allowedOrigins));
                policyBuilder.WithOrigins(allowedOrigins.ToArray())
                             .AllowAnyHeader()
                             .AllowAnyMethod()
                             .AllowCredentials();
            }
            else
            {
                corsNlogLogger.Fatal("CRITICAL: No CORS origins specified for 'AllowWebApp' policy in environment: {EnvironmentName}. API will likely be inaccessible from the intended frontends.", builder.Environment.EnvironmentName);
                // Fallback to a very restrictive or no policy if none are configured, to avoid accidentally allowing all.
                // policyBuilder.WithOrigins("http://example.com"); // Effectively blocks if example.com is not used
            }
        });
    });

    builder.Services.AddControllers();
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
                nlogLogger.Info("XML comments for Swagger loaded from: {XmlPath}", xmlPath);
            }
            else
            {
                nlogLogger.Warn("Swagger XML comment file NOT found at: {XmlPath}", xmlPath);
            }
        }
        catch (Exception ex) { nlogLogger.Error(ex, "Error loading XML comments for Swagger."); }
        options.OperationFilter<FileUploadOperationFilter>();
    });

    builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

    // Configure Data Protection to Persist Keys
    var dpKeysPathFromConfig = builder.Configuration.GetValue<string>("DataProtection:KeysPath");
    var dataProtectionKeysFolder = dpKeysPathFromConfig;

    if (string.IsNullOrWhiteSpace(dataProtectionKeysFolder))
    {
        // This fallback is used if DataProtection:KeysPath is not set in .env or appsettings
        dataProtectionKeysFolder = Path.Combine(builder.Environment.ContentRootPath, "DataProtection-Keys-LocalFallback");
        nlogLogger.Warn("DataProtection:KeysPath configuration not found or is empty. Using fallback local path: {FallbackKeysPath}", dataProtectionKeysFolder);
    }

    // Attempt to create directory only in development for the fallback, or if the configured path is relative
    // For Docker, the path like /app/DataProtection-Keys is absolute and the volume mount handles creation.
    if (!Path.IsPathRooted(dataProtectionKeysFolder) && isDevelopment && !Directory.Exists(dataProtectionKeysFolder))
    {
        try { Directory.CreateDirectory(dataProtectionKeysFolder); }
        catch (Exception ex) { nlogLogger.Warn(ex, "Could not create DataProtection keys folder at relative path {KeysFolder}. Keys may not persist.", dataProtectionKeysFolder); }
    }
    // Ensure the final path exists if we are to use it, especially if absolute path was provided.
    // Docker volume mounts will handle directory creation on the host for the mapped target.
    // This check here is more for non-containerized or if an absolute path inside container needs creation.
    if (Directory.Exists(Path.GetDirectoryName(dataProtectionKeysFolder)) || (isDevelopment && !Path.IsPathRooted(dataProtectionKeysFolder)))
    {
        try
        {
            // Ensure the final directory exists, especially if ContentRootPath was used
            if (!Directory.Exists(dataProtectionKeysFolder)) Directory.CreateDirectory(dataProtectionKeysFolder);

            builder.Services.AddDataProtection()
                .PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysFolder))
                .SetApplicationName("WandleWheelhouseApp"); // Optional: helps isolate keys if multiple apps use the same store
            nlogLogger.Info("Data Protection keys configured to persist to: {KeysFolder}", dataProtectionKeysFolder);
        }
        catch (Exception ex)
        {
            nlogLogger.Error(ex, "Failed to configure Data Protection key persistence at {KeysFolder}. Keys may not persist or may be ephemeral.", dataProtectionKeysFolder);
        }
    }
    else
    {
        nlogLogger.Error("Data Protection keys folder path '{KeysFolder}' directory does not exist and could not be readily created. Keys may be ephemeral.", dataProtectionKeysFolder);
        if (!isDevelopment && !string.IsNullOrWhiteSpace(dpKeysPathFromConfig))
        {
            // In Production, if a path was configured but doesn't exist, it's a more critical issue.
            throw new InvalidOperationException($"Production DataProtection:KeysPath ('{dpKeysPathFromConfig}') directory does not exist. Please ensure the path and volume mounts are correct.");
        }
    }

    // --- 2. Configure HTTP Request Pipeline ---
    var app = builder.Build();

    app.Logger.LogInformation("Application starting up. Environment: {EnvironmentName}", app.Environment.EnvironmentName);
    app.Logger.LogInformation("Data Protection keys target path: {EffectiveDpKeysPath}", dataProtectionKeysFolder); // Log the path being used

    // Automatic Migrations and Seeding
    // Consider making the 'ApplyMigrationsAndSeedOnStartup' flag more specific for its purpose.
    if (app.Configuration.GetValue<bool>("ApplyMigrationsAndSeedOnStartup", isDevelopment)) // Defaults to true in dev
    {
        app.Logger.LogInformation("ApplyMigrationsAndSeedOnStartup: Checking for database actions...");
        using (var scope = app.Services.CreateScope())
        {
            var services = scope.ServiceProvider;
            var dbContext = services.GetRequiredService<ApplicationDbContext>();
            var appConfig = services.GetRequiredService<IConfiguration>();
            var appSpecificLogger = services.GetRequiredService<ILogger<Program>>(); // NLog will handle this

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
                throw; // Halt application startup on critical DB setup error
            }
        }
    }

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Wandle Wheelhouse API V1");
            c.EnablePersistAuthorization(); // Optional: to persist JWT in Swagger UI
        });
        app.UseDeveloperExceptionPage();
    }
    else // Production
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
        app.UseHsts(); // The default HSTS value is 30 days.
    }

    // HTTPS Redirection: Typically handled by the reverse proxy (Nginx Proxy Manager) in production.
    // Only enable this if Kestrel is directly handling HTTPS termination, or if X-Forwarded-Proto is correctly set by your proxy.
    // if (!app.Environment.IsDevelopment())
    // {
    //     app.UseHttpsRedirection();
    // }

    // Static Files Configuration
    app.UseStaticFiles(); // For general wwwroot (if you place any files there)

    var uploadsPath = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"), "uploads");
    if (!Directory.Exists(uploadsPath) && isDevelopment) // Only attempt to auto-create in development
    {
        try { Directory.CreateDirectory(uploadsPath); app.Logger.LogInformation("Created directory for uploads: {UploadsPath}", uploadsPath); }
        catch (Exception ex) { app.Logger.LogError(ex, "Failed to create directory for uploads: {UploadsPath}", uploadsPath); }
    }
    if (Directory.Exists(uploadsPath))
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(uploadsPath),
            RequestPath = "/uploads" // Serve files from /uploads URL path
        });
        app.Logger.LogInformation("Static files from {UploadsPath} will be served at /uploads", uploadsPath);
    }
    else
    {
        app.Logger.LogWarning("Uploads directory not found at {UploadsPath}. Uploaded files may not be accessible.", uploadsPath);
    }


    app.UseRouting();       // Defines route matching
    app.UseCors("AllowWebApp"); // Apply the CORS policy globally

    // Visitor Tracking Middleware - uncomment if VisitorTrackingMiddleware.cs is implemented and correct
    // if (app.Configuration.GetValue<bool>("EnableVisitorTracking", false)) // Example: Toggle via config
    // {
    //     // app.UseMiddleware<VisitorTrackingMiddleware>();
    // }

    app.UseAuthentication(); // Who are you?
    app.UseAuthorization();  // Are you allowed?

    app.MapControllers();    // Map controller routes

    app.Logger.LogInformation("Wandle Wheelhouse API starting up...");
    app.Run(); // Start the application
}
catch (Exception exception)
{
    // NLog: catch setup errors or unhandled exceptions from WebApplication.CreateBuilder/Run
    nlogLogger.Error(exception, "Program stopped due to an unhandled exception during startup or shutdown.");
    throw; // Re-throw the exception to ensure the process terminates and logs correctly (e.g., in Docker)
}
finally
{
    // Ensure to flush and stop internal timers/threads before application-exit (Avoid segmentation fault on Linux)
    nlogLogger.Info("NLog shutting down...");
    NLog.LogManager.Shutdown();
}