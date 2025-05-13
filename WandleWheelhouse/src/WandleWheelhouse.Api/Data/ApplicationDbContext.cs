using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using WandleWheelhouse.Api.Models;

namespace WandleWheelhouse.Api.Data;

#nullable enable

// Use IdentityDbContext<User> to include Identity tables (Users, Roles, Claims, etc.)
public class ApplicationDbContext : IdentityDbContext<User>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // Define DbSets for your custom entities
    public DbSet<Donation> Donations { get; set; } = null!;
    public DbSet<Subscription> Subscriptions { get; set; } = null!;
    public DbSet<NewsletterSubscription> NewsletterSubscriptions { get; set; } = null!;
    public DbSet<BlogArticle> BlogArticles { get; set; } = null!;
    // At the top with other DbSets
    public DbSet<ContactInquiry> ContactInquiries { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder); // **IMPORTANT**: Call base first for Identity models

        // Configure unique index for Newsletter email to prevent duplicates
        builder.Entity<NewsletterSubscription>()
            .HasIndex(ns => ns.Email)
            .IsUnique();

        // Configure decimal precision for currency fields
        builder.Entity<Donation>()
            .Property(d => d.Amount)
            .HasPrecision(18, 2);

        builder.Entity<Subscription>()
            .Property(s => s.MonthlyAmount)
            .HasPrecision(18, 2);

        // Configure relationships (EF Core often infers these, but explicit is clearer)
        builder.Entity<User>()
            .HasMany(u => u.Donations)
            .WithOne(d => d.User)
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.SetNull); // Or Restrict, depending on requirements

        builder.Entity<User>()
            .HasMany(u => u.Subscriptions)
            .WithOne(s => s.User)
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade); // Cascade delete subscriptions if user is deleted

        builder.Entity<BlogArticle>()
            .HasOne(ba => ba.Author)
            .WithMany() // Assuming a user can write many articles, but an article has one author
            .HasForeignKey(ba => ba.AuthorId)
            .OnDelete(DeleteBehavior.Restrict); // Prevent deleting a user if they have articles

        builder.Entity<NewsletterSubscription>()
           .HasOne(ns => ns.User)
           .WithMany() // Assuming user can have only one newsletter sub linked (or change if needed)
           .HasForeignKey(ns => ns.UserId)
           .IsRequired(false) // Allow anonymous newsletter subs
           .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<ContactInquiry>(entity =>
            {
                entity.HasIndex(ci => ci.SubmittedAt);
                entity.HasIndex(ci => ci.Type);
                entity.HasIndex(ci => ci.IsArchived);
                entity.Property(ci => ci.Type).HasConversion<string>(); // Store enum as string
            });

        // Seed initial Roles (Administrator, Editor, Member)
        SeedRoles(builder);
    }

    private static void SeedRoles(ModelBuilder builder)
    {
        string adminRoleId = "2c5e174e-3b0e-446f-86af-483d56fd7210"; ;
        string editorRoleId = "a1d5e7a6-1b9e-4b5f-9c8d-5e4f7e8a1b2c";
        string memberRoleId = "b2e8f9b5-2c8d-4e6f-8a7b-6d5c4e3b2a1d";

        builder.Entity<IdentityRole>().HasData(
            new IdentityRole { Id = adminRoleId, Name = "Administrator", NormalizedName = "ADMINISTRATOR" },
            new IdentityRole { Id = editorRoleId, Name = "Editor", NormalizedName = "EDITOR" },
            new IdentityRole { Id = memberRoleId, Name = "Member", NormalizedName = "MEMBER" }
            // Anonymous users don't typically have a role in the database
        );

        // Optional: Seed an initial Admin user (use secrets management for password in real scenarios)
        // var hasher = new PasswordHasher<User>();
        // builder.Entity<User>().HasData(
        //     new User
        //     {
        //         Id = Guid.NewGuid().ToString(), // Should be a stable GUID
        //         UserName = "admin@wandlewheelhouse.org",
        //         NormalizedUserName = "ADMIN@WANDLEWHEELHOUSE.ORG",
        //         Email = "admin@wandlewheelhouse.org",
        //         NormalizedEmail = "ADMIN@WANDLEWHEELHOUSE.ORG",
        //         FirstName = "Admin",
        //         LastName = "User",
        //         EmailConfirmed = true,
        //         PasswordHash = hasher.HashPassword(null!, "AdminP@ssw0rd1!"), // USE SECRETS!
        //         SecurityStamp = Guid.NewGuid().ToString("D") // Required by Identity
        //     }
        // );

        // // Optional: Assign the Admin user to the Administrator role
        // builder.Entity<IdentityUserRole<string>>().HasData(
        //     new IdentityUserRole<string>
        //     {
        //         RoleId = adminRoleId,
        //         UserId = // The Id of the admin user created above
        //     }
        // );
    }
}
#nullable disable