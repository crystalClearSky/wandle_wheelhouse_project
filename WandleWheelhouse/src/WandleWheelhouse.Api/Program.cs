// Location: src/WandleWheelhouse.Api/Program.cs

// --- Using Statements ---
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using WandleWheelhouse.Api.Data;
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.Services;
using WandleWheelhouse.Api.UnitOfWork;
using System.IO; // For Path
using System.Reflection; // For Assembly
using WandleWheelhouse.Api.SwaggerFilters; // <-- Add using for your filter's namespace
using Microsoft.Extensions.FileProviders; // For PhysicalFileProvider
using Microsoft.AspNetCore.Http; // For StatusCodes

var builder = WebApplication.CreateBuilder(args);

// --- 1. Configure Services ---

// Database Context Configuration
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var isDevelopment = builder.Environment.IsDevelopment();

if (isDevelopment)
{
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseSqlite(connectionString));
}
else
{
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString),
            mySqlOptions => mySqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorNumbersToAdd: null)
            ));
}

// Email Sender Registration
if (builder.Environment.IsDevelopment())
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
    options.Password.RequiredLength = 6;
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
var secretKey = Encoding.ASCII.GetBytes(jwtSettings["Key"]
    ?? throw new InvalidOperationException("JWT Key is missing in configuration"));

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
        ClockSkew = TimeSpan.Zero
    };
});

// Authorization (Role Policies)
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdministratorRole", policy => policy.RequireRole("Administrator"));
    options.AddPolicy("RequireEditorRole", policy => policy.RequireRole("Administrator", "Editor"));
    options.AddPolicy("RequireMemberRole", policy => policy.RequireRole("Administrator", "Editor", "Member"));
});

// CORS Configuration (Global)
// Inside Program.cs -> Service Configuration section

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowWebApp", // Name this policy
        policyBuilder =>
        {
            List<string> allowedOrigins = new List<string>();
            if (isDevelopment) // Check if this is true when you run
            {
                // Add YOUR specific frontend development URL(s)
                allowedOrigins.Add("http://localhost:5174"); // <-- ADD THIS
                allowedOrigins.Add("http://127.0.0.1:5174"); // <-- AND THIS (Good practice)

                // Keep existing ones if needed (e.g., Vite default, Swagger)
                allowedOrigins.Add("http://localhost:5173");
                allowedOrigins.Add("http://127.0.0.1:5173");
                allowedOrigins.Add($"https://localhost:{builder.Configuration.GetValue<int>("HttpsPort", 7136)}");
                allowedOrigins.Add($"http://localhost:{builder.Configuration.GetValue<int>("HttpPort", 5041)}");
            }
            else
            {
                // Production frontend URL(s)
                allowedOrigins.Add("https://wandlewheelhouse.org"); // Replace with actual prod URL
            }

            policyBuilder.WithOrigins(allowedOrigins.ToArray()) // Use the updated list
                         .AllowAnyHeader()
                         .AllowAnyMethod()
                         .AllowCredentials(); // Allow credentials (needed for auth)
        });
});
// Controller Services
builder.Services.AddControllers();

// Swagger/OpenAPI Configuration
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Wandle Wheelhouse API", Version = "v1" });

    // Security Definition (Bearer Auth)
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    // Security Requirement
    options.AddSecurityRequirement(new OpenApiSecurityRequirement {
    {
        new OpenApiSecurityScheme
        {
            Reference = new OpenApiReference
            {
                Type = ReferenceType.SecurityScheme,
                Id = "Bearer"
            }
        },
        new string[] {}
    }});

    // Include XML Comments
    try
    {
         var xmlFilename = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
         var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFilename);
         if (File.Exists(xmlPath))
         {
             options.IncludeXmlComments(xmlPath);
             Console.WriteLine($"Successfully included XML comments from: {xmlPath}");
         } else {
             Console.WriteLine($"XML comment file not found at: {xmlPath}");
         }
    }
    catch(Exception ex)
    {
         Console.WriteLine($"Error including XML comments: {ex.Message}");
    }

    // --- Register the Custom Operation Filter for File Uploads ---
    options.OperationFilter<FileUploadOperationFilter>(); // <-- ADD THIS LINE
    // --- End Filter Registration ---

});

// Register custom application services
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
// Add other services like IPaymentService etc. if/when created

// --- 2. Configure HTTP Request Pipeline ---

var app = builder.Build();

// --- Development Only: Reset SQLite Database on Startup ---
if (app.Environment.IsDevelopment())
{
    // using (var scope = app.Services.CreateScope())
    // {
    //     var services = scope.ServiceProvider;
    //     var logger = services.GetRequiredService<ILogger<Program>>();
    //     try
    //     {
    //         var context = services.GetRequiredService<ApplicationDbContext>();
    //         logger.LogInformation("Development: Deleting existing development database...");
    //         await context.Database.EnsureDeletedAsync();
    //         logger.LogInformation("Development: Database deleted successfully.");
    //         logger.LogInformation("Development: Applying migrations to create database...");
    //         await context.Database.MigrateAsync();
    //         logger.LogInformation("Development: Database created and migrations applied.");
    //         // Optional Seeding
    //     }
    //     catch (Exception ex)
    //     {
    //         logger.LogError(ex, "An error occurred during development database reset.");
    //     }
    // }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Wandle Wheelhouse API V1");
        c.EnablePersistAuthorization(); // Optional: Persist auth token in browser session
    });
    // Use Developer Exceptions Page AFTER Swagger setup for better Swagger error visibility
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/Error"); // Configure a proper error handling page/endpoint
    app.UseHsts();
}

app.UseHttpsRedirection();

// --- Static Files Configuration ---
// Serve files from wwwroot (if it exists)
app.UseStaticFiles();

// Specifically configure serving files from the 'uploads' directory
// Ensure 'uploads' folder exists inside wwwroot folder at the API project root
var uploadsPath = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"), "uploads");
if (!Directory.Exists(uploadsPath))
{
    try {
         Directory.CreateDirectory(uploadsPath);
         Console.WriteLine($"Created directory: {uploadsPath}");
    } catch (Exception ex) {
         Console.WriteLine($"Failed to create directory {uploadsPath}: {ex.Message}");
    }
}

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath), // Use correct using: Microsoft.Extensions.FileProviders
    RequestPath = "/uploads" // Access files via https://.../uploads/...
});
// --- End Static Files Configuration ---


// IMPORTANT: Middleware Order Matters!
app.UseCors("AllowWebApp"); // CORS before Auth

app.UseAuthentication(); // Who are you?
app.UseAuthorization(); // Are you allowed?

app.MapControllers(); // Map controller routes AFTER Auth setup

app.Run(); // Start the application