// src/WandleWheelhouse.Api/Data/Seed/IdentityDataSeeder.cs
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading.Tasks;
using WandleWheelhouse.Api.Models; // Your User model

namespace WandleWheelhouse.Api.Data.Seed
{
    public static class IdentityDataSeeder
    {
        public static async Task Initialize(IServiceProvider serviceProvider, IConfiguration configuration, ILogger logger)
        {
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = serviceProvider.GetRequiredService<UserManager<User>>();

            string[] roleNames = { "Administrator", "Editor", "Member" };

            foreach (var roleName in roleNames)
            {
                var roleExist = await roleManager.RoleExistsAsync(roleName);
                if (!roleExist)
                {
                    // Create the roles and seed them to the database
                    await roleManager.CreateAsync(new IdentityRole(roleName));
                    logger.LogInformation("Role '{RoleName}' created.", roleName);
                }
            }

            // Get Default Admin User configuration
            var adminEmail = configuration["DefaultAdminUser:Email"];
            var adminPassword = configuration["DefaultAdminUser:Password"];
            var adminFirstName = configuration["DefaultAdminUser:FirstName"];
            var adminLastName = configuration["DefaultAdminUser:LastName"] ?? "User";

            if (string.IsNullOrEmpty(adminEmail) || string.IsNullOrEmpty(adminPassword) || string.IsNullOrEmpty(adminFirstName))
            {
                logger.LogError("DefaultAdminUser configuration is missing or incomplete in appsettings. Cannot seed admin user.");
                return;
            }
             var adminUser = await userManager.FindByEmailAsync(adminEmail);
            if (adminUser == null)
            {
                adminUser = new User
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    FirstName = adminFirstName,
                    LastName = configuration["DefaultAdminUser:LastName"] ?? "User", // Use configured or default
                    EmailConfirmed = true // Automatically confirm email for this seeded admin
                };

                var result = await userManager.CreateAsync(adminUser, adminPassword);

                if (result.Succeeded)
                {
                    logger.LogInformation("Default admin user '{AdminEmail}' created successfully.", adminEmail);
                    // Assign the Administrator role
                    await userManager.AddToRoleAsync(adminUser, "Administrator");
                    logger.LogInformation("Role 'Administrator' assigned to '{AdminEmail}'.", adminEmail);
                }
                else
                {
                    logger.LogError("Failed to create default admin user '{AdminEmail}'. Errors: {Errors}", adminEmail, string.Join(", ", result.Errors.Select(e => e.Description)));
                }
            }
            else
            {
                logger.LogInformation("Default admin user '{AdminEmail}' already exists.", adminEmail);
                // Optionally, ensure the existing admin user has the Administrator role
                if (!await userManager.IsInRoleAsync(adminUser, "Administrator"))
                {
                    await userManager.AddToRoleAsync(adminUser, "Administrator");
                    logger.LogInformation("Role 'Administrator' assigned to existing user '{AdminEmail}'.", adminEmail);
                }
            }
        }
    }
}

            // Check if the admin user already exists