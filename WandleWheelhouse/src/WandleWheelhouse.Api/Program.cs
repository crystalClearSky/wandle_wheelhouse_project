using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using WandleWheelhouse.Api.Data;
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.UnitOfWork; // Your User model namespace

var builder = WebApplication.CreateBuilder(args);

// --- 1. Configure Services ---

// Database Context Configuration (Handles Development vs. Production)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var isDevelopment = builder.Environment.IsDevelopment();

if (isDevelopment)
{
    // Use SQLite in Development
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseSqlite(connectionString));
}
else
{
    // Use MySQL in Production
    // Ensure 'connectionString' is properly set for MySQL in appsettings.Production.json or env vars
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString),
            mySqlOptions => mySqlOptions.EnableRetryOnFailure( // Optional: resilience
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorNumbersToAdd: null)
            ));
}

// Identity Configuration
builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    // Password complexity requirements
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 6;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true; // Requires symbols
    options.Password.RequiredUniqueChars = 1; // Number of unique chars

    // Lockout settings (optional but recommended)
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;

    // User settings
    options.User.RequireUniqueEmail = true;
    options.SignIn.RequireConfirmedAccount = false; // Set to true if email confirmation is needed
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders(); // Required for password reset, email confirmation tokens


// JWT Authentication Configuration
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = Encoding.ASCII.GetBytes(jwtSettings["Key"]
    ?? throw new InvalidOperationException("JWT Key is missing in configuration")); // Ensure key exists

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme; // Specify default scheme
})
.AddJwtBearer(options =>
{
    options.SaveToken = true; // Save token to HttpContext
    options.RequireHttpsMetadata = !isDevelopment; // Require HTTPS in production
    options.TokenValidationParameters = new TokenValidationParameters()
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(secretKey),
        ClockSkew = TimeSpan.Zero // Optional: remove clock skew tolerance for exact expiry
    };

    // --- Handling JWT in Cookies (If needed alongside Bearer for session-like behavior) ---
    // This allows the browser to automatically send the token in a cookie,
    // BUT it requires careful CSRF protection on the frontend for state-changing requests.
    // Standard SPAs often prefer sending the Bearer token manually in Authorization header via JS.
    // Choose ONE primary method or understand the security implications of using both.
    // For simplicity and common SPA patterns, we'll focus on Bearer tokens sent via JS.
    // If cookie-based session is strictly required:
    // options.Events = new JwtBearerEvents
    // {
    //     OnMessageReceived = context =>
    //     {
    //         context.Token = context.Request.Cookies["X-Access-Token"]; // Read token from a cookie
    //         return Task.CompletedTask;
    //     }
    // };
    // Login endpoint would need to SET this cookie (HttpOnly, Secure, SameSite=Strict).
});


// Authorization (Role Policies)
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdministratorRole", policy => policy.RequireRole("Administrator"));
    options.AddPolicy("RequireEditorRole", policy => policy.RequireRole("Administrator", "Editor")); // Admins are also Editors
    options.AddPolicy("RequireMemberRole", policy => policy.RequireRole("Administrator", "Editor", "Member")); // All logged-in are Members
});


// CORS Configuration (Global)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowWebApp", // Name this policy
        policyBuilder =>
        {
            // IMPORTANT: Be specific in production!
            List<string> allowedOrigins = new List<string>();
            if (isDevelopment)
            {
                // Add Vite default dev server AND Swagger UI's origin for dev
                allowedOrigins.Add("http://localhost:5173"); // Vite default
                allowedOrigins.Add("http://127.0.0.1:5173"); // Vite alternative
                allowedOrigins.Add($"https://localhost:{builder.Configuration.GetValue<int>("HttpsPort", 7136)}"); // Get port dynamically or hardcode
                allowedOrigins.Add($"http://localhost:{builder.Configuration.GetValue<int>("HttpPort", 5041)}");  // Allow HTTP too if needed
            }
            else
            {
                // Production frontend URL(s)
                allowedOrigins.Add("https://wandlewheelhouse.org");
            }
// Optional: To get ports dynamically, add them to appsettings.Development.json
// "HttpsPort": 7136,
// "HttpPort": 5041,
// Ensure your launchSettings.json ports match! Your HTTPS port is 7136.

            policyBuilder.WithOrigins(allowedOrigins.ToArray()) // Use the list
                         .AllowAnyHeader()
                         .AllowAnyMethod()
                         .AllowCredentials();
        });
});


// builder.Services.AddCors(options =>
// {
//     options.AddPolicy("AllowWebApp", // Name this policy
//         policyBuilder =>
//         {
//             // IMPORTANT: Be specific in production!
//             string[] allowedOrigins = isDevelopment
//                 ? new[] { "http://localhost:5173", "http://127.0.0.1:5173" } // Vite default dev server
//                 : new[] { "https://wandlewheelhouse.org" }; // Your production frontend URL

//             policyBuilder.WithOrigins(allowedOrigins) // Allow specific frontend origins
//                          .AllowAnyHeader() // Allow common headers
//                          .AllowAnyMethod() // Allow common HTTP methods (GET, POST, PUT, DELETE, OPTIONS)
//                          .AllowCredentials(); // Crucial for cookies/auth headers
//         });
// });

// Add Controllers
builder.Services.AddControllers();

// Swagger/OpenAPI Configuration
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Wandle Wheelhouse API", Version = "v1" });

    // Add JWT Authentication support in Swagger UI
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter JWT with Bearer into field (e.g., 'Bearer <token>')",
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey, // Use ApiKey for Bearer input field
        Scheme = "Bearer"
    });

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
        new string[] {} // No specific scopes needed here
    }});
});

// Register custom services (Repository, UnitOfWork, EmailSender, Payment Processors etc. - will be added later)
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// builder.Services.AddScoped<IDonationRepository, DonationRepository>();
// builder.Services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
// builder.Services.AddScoped<INewsletterSubscriptionRepository, NewsletterSubscriptionRepository>();
// builder.Services.AddScoped<IBlogArticleRepository, BlogArticleRepository>();

// builder.Services.AddScoped<IPaymentService, MockPaymentService>(); // Example

// --- 2. Configure HTTP Request Pipeline ---

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Wandle Wheelhouse API V1");
        // Optional: Configure Swagger UI for better JWT handling if needed
        // c.EnablePersistAuthorization(); // Persist auth token in browser session
    });
    app.UseDeveloperExceptionPage(); // More detailed errors in dev
}
else
{
    app.UseExceptionHandler("/Error"); // Configure a proper error handling page/endpoint
    app.UseHsts(); // Enforce HTTPS Strict Transport Security
}

app.UseHttpsRedirection(); // Redirect HTTP to HTTPS

// IMPORTANT: Place UseCors BEFORE UseAuthentication and UseAuthorization
app.UseCors("AllowWebApp"); // Apply the CORS policy

app.UseAuthentication(); // Enable authentication middleware
app.UseAuthorization(); // Enable authorization middleware

// Map controllers using attribute routing
app.MapControllers();

// --- 3. Apply Migrations & Seed Data (Optional: Can be done manually or via script) ---
// This is a common pattern to auto-apply migrations on startup (esp. useful in containers)
// BE CAREFUL with this in production clustered environments. Manual migration is often safer.
// using (var scope = app.Services.CreateScope())
// {
//     var services = scope.ServiceProvider;
//     try
//     {
//         var context = services.GetRequiredService<ApplicationDbContext>();
//         context.Database.Migrate(); // Apply pending migrations

//         // Optional: Seed initial data (Roles, Admin User) if not done in OnModelCreating
//         // await SeedData.Initialize(services); // Create a SeedData class
//     }
//     catch (Exception ex)
//     {
//         var logger = services.GetRequiredService<ILogger<Program>>();
//         logger.LogError(ex, "An error occurred migrating or seeding the DB.");
//         // Decide if the application should fail to start
//     }
// }


app.Run(); // Start the application