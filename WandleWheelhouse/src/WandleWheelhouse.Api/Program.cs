// Location: src/WandleWheelhouse.Api/Program.cs

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection; // For Data Protection
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration; // For IConfiguration
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;       // For ILogger<Program>
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.IO;
using System.Reflection;
using System.Text;
using WandleWheelhouse.Api.Data;
using WandleWheelhouse.Api.Data.Seed;     // <-- For IdentityDataSeeder
// using WandleWheelhouse.Api.Middleware;   // For VisitorTrackingMiddleware
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.Services;
using WandleWheelhouse.Api.SwaggerFilters;
using WandleWheelhouse.Api.UnitOfWork;

var builder = WebApplication.CreateBuilder(args);
var isDevelopment = builder.Environment.IsDevelopment();

// --- 1. Configure Services ---

// Database Context Configuration
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found in configuration. Ensure it's in .env for Docker or appsettings/user secrets for local non-Docker.");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptionsAction: sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorCodesToAdd: null);
    }));

// Email Sender Registration
if (isDevelopment)
{
    builder.Services.AddSingleton<IEmailSender, DummyEmailSender>();
}
else
{
    builder.Services.AddSingleton<IEmailSender, DummyEmailSender>(); // TODO: Replace with real sender for production
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
    ?? throw new InvalidOperationException("JWT Key ('Jwt:Key') is missing. Ensure it's in .env (e.g., JWT_KEY) or appsettings/user secrets.");

if (Encoding.ASCII.GetBytes(secretKeyString).Length < 32 && isDevelopment)
{
    var tempLogger = LoggerFactory.Create(logBuilder => logBuilder.AddConsole()).CreateLogger<Program>();
    tempLogger.LogWarning(
        "SECURITY WARNING: JWT Key ('Jwt:Key') is less than 32 bytes (256 bits). " +
        "This is INSECURE. Please use a strong, random key of at least 32 characters. " +
        "Current Key (partial for safety): '{PartialKey}...'",
        secretKeyString.Substring(0, Math.Min(secretKeyString.Length, 5))
    );
    // Consider throwing an exception here even in dev if you want to enforce strong keys early.
}
else if (Encoding.ASCII.GetBytes(secretKeyString).Length < 32 && !isDevelopment)
{
    throw new InvalidOperationException("PRODUCTION ERROR: JWT Key must be at least 256 bits (e.g., 32 ASCII characters if using HS256).");
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
        var loggerFactory = LoggerFactory.Create(logBuilder => logBuilder.AddConsole()); // Temp logger for CORS setup
        var corsLogger = loggerFactory.CreateLogger("CORS_Policy_Setup");

        if (isDevelopment)
        {
            allowedOrigins.Add("http://localhost:5174"); // Local Vite dev on Windows (Old)
            allowedOrigins.Add("http://127.0.0.1:5174");

            allowedOrigins.Add("http://localhost:8080"); // Docker client on Windows
            allowedOrigins.Add("http://127.0.0.1:8080");

            allowedOrigins.Add("http://localhost:5173"); // <-- ADD THIS if Vite sometimes uses 5173
            allowedOrigins.Add("http://127.0.0.1:5173"); // <-- AND THIS

            allowedOrigins.Add($"http://{builder.Configuration.GetValue<string>("PiLocalIp", "192.168.1.166")}:{builder.Configuration.GetValue<int>("PiClientPort", 5000)}"); // Client on Pi
            allowedOrigins.Add($"https://localhost:{builder.Configuration.GetValue<int>("HttpsPort", 7136)}"); // Swagger local
            allowedOrigins.Add($"http://localhost:{builder.Configuration.GetValue<int>("HttpPort", 5041)}");   // Swagger local
            allowedOrigins.Add($"http://{builder.Configuration.GetValue<string>("PiLocalIp", "192.168.1.166")}:{builder.Configuration.GetValue<int>("PiApiPort", 5001)}"); // Swagger on Pi
        }
        else // Production
        {
            var prodOriginsConfig = builder.Configuration.GetValue<string>("CORS:AllowedOrigins");
            if (!string.IsNullOrWhiteSpace(prodOriginsConfig))
            {
                allowedOrigins.AddRange(prodOriginsConfig.Split(';', StringSplitOptions.RemoveEmptyEntries).Select(o => o.Trim()));
            }
        }

        if (allowedOrigins.Any())
        {
            corsLogger.LogInformation("CORS Allowed Origins: {Origins}", string.Join(", ", allowedOrigins));
            policyBuilder.WithOrigins(allowedOrigins.ToArray())
                         .AllowAnyHeader()
                         .AllowAnyMethod()
                         .AllowCredentials();
        }
        else
        {
            corsLogger.LogCritical("CRITICAL: No CORS origins specified for the current environment. API may be inaccessible from frontend.");
            // Consider a restrictive default or throwing an error in production if no origins configured.
            // policyBuilder.WithOrigins("http://example.com").AllowAnyHeader().AllowAnyMethod(); // Example restrictive
        }
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Wandle Wheelhouse API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { /* ... as before ... */ });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement { /* ... as before ... */ });
    try
    {
        var xmlFilename = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
        var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFilename);
        if (File.Exists(xmlPath)) { options.IncludeXmlComments(xmlPath); Console.WriteLine($"XML comments loaded from: {xmlPath}"); }
        else { Console.WriteLine($"XML comment file NOT found at: {xmlPath}"); }
    }
    catch (Exception ex) { Console.WriteLine($"Error loading XML comments: {ex.Message}"); }
    options.OperationFilter<FileUploadOperationFilter>();
});

builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// Configure Data Protection to Persist Keys
var keysFolderFromConfig = builder.Configuration.GetValue<string>("DataProtection:KeysPath"); // Reads DataProtection__KeysPath env var
var dataProtectionKeysFolder = keysFolderFromConfig;
if (string.IsNullOrWhiteSpace(dataProtectionKeysFolder))
{
    dataProtectionKeysFolder = Path.Combine(builder.Environment.ContentRootPath, "DataProtection-Keys-LocalFallback");
}
if (!Directory.Exists(dataProtectionKeysFolder) && isDevelopment)
{
    try { Directory.CreateDirectory(dataProtectionKeysFolder); } catch { /* Log warning if needed */ }
}
if (Directory.Exists(dataProtectionKeysFolder))
{
    builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysFolder));
}
else if (!isDevelopment && string.IsNullOrWhiteSpace(keysFolderFromConfig))
{
    throw new InvalidOperationException($"Production DataProtectionKeysPath ('{keysFolderFromConfig}') not configured/found.");
}

// --- 2. Configure HTTP Request Pipeline ---
var app = builder.Build();

// Log effective DataProtectionKeysPath
var effectiveDpKeysPath = dataProtectionKeysFolder;
if (string.IsNullOrWhiteSpace(builder.Configuration.GetValue<string>("DataProtection:KeysPath")))
{
    effectiveDpKeysPath = Path.Combine(app.Environment.ContentRootPath, "DataProtection-Keys-LocalFallback");
}
app.Logger.LogInformation("Data Protection keys will be stored at: {EffectiveDpKeysPath}", effectiveDpKeysPath);


// --- Automatically Apply Migrations and Seed Data on Startup ---
// Use a more descriptive config key if desired
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("ApplyMigrationsAndSeedOnStartup", false))
{
    app.Logger.LogInformation("ApplyMigrationsAndSeedOnStartup: Checking for database actions...");
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        var dbContext = services.GetRequiredService<ApplicationDbContext>();
        var appConfig = services.GetRequiredService<IConfiguration>(); // Get IConfiguration
        var appLogger = services.GetRequiredService<ILogger<Program>>(); // Get ILogger<Program>

        try
        {
            if (dbContext.Database.GetPendingMigrations().Any())
            {
                appLogger.LogInformation("ApplyMigrationsAndSeedOnStartup: Applying pending database migrations...");
                await dbContext.Database.MigrateAsync();
                appLogger.LogInformation("ApplyMigrationsAndSeedOnStartup: Database migrations applied successfully.");
            }
            else
            {
                appLogger.LogInformation("ApplyMigrationsAndSeedOnStartup: No pending database migrations to apply.");
            }

            // --- Call the IdentityDataSeeder ---
            appLogger.LogInformation("ApplyMigrationsAndSeedOnStartup: Attempting to seed initial identity data...");
            await IdentityDataSeeder.Initialize(services, appConfig, appLogger); // Pass IServiceProvider, IConfiguration, ILogger
            appLogger.LogInformation("ApplyMigrationsAndSeedOnStartup: Identity data seeding process completed.");
            // --- End Seeding Call ---
        }
        catch (Exception ex)
        {
            appLogger.LogError(ex, "ApplyMigrationsAndSeedOnStartup: An error occurred while migrating or seeding the database.");
        }
    }
}
// --- End Automatic Migration and Seed ---

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
    app.UseExceptionHandler(appBuilder => { /* ... production error handler ... */ });
    app.UseHsts();
}

// HTTPS Redirection: Comment out if your reverse proxy on Pi handles HTTPS termination
// if (!app.Environment.IsDevelopment()) // Or more specific check for proxy
// {
//     app.UseHttpsRedirection();
// }

// Static Files Configuration
app.UseStaticFiles(); // For general wwwroot (if used)
var uploadsPath = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"), "uploads");
if (!Directory.Exists(uploadsPath) && app.Environment.IsDevelopment())
{ // Only auto-create in dev
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
}

app.UseRouting();
app.UseCors("AllowWebApp");

// Visitor Tracking Middleware (if you created it and want to use it)
// Make sure the class and namespace WandleWheelhouse.Api.Middleware.VisitorTrackingMiddleware exist
// app.UseMiddleware<VisitorTrackingMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();