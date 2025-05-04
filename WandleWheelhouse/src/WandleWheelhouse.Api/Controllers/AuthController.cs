using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using WandleWheelhouse.Api.DTOs.Auth;
using WandleWheelhouse.Api.Models;
using Microsoft.EntityFrameworkCore; // Your User model

namespace WandleWheelhouse.Api.Controllers;

public class AuthController : BaseApiController // Inherit from BaseApiController
{
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger; // Add logging

    // Inject necessary services
    public AuthController(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        RoleManager<IdentityRole> roleManager,
        IConfiguration configuration,
        ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
    {
        _logger.LogInformation("Registration attempt for {Email}", registerDto.Email);

        // 1. Check if user already exists
        var existingUser = await _userManager.FindByEmailAsync(registerDto.Email);
        if (existingUser != null)
        {
            _logger.LogWarning("Registration failed: Email {Email} already exists.", registerDto.Email);
            return BadRequest(new AuthResponseDto { IsSuccess = false, Message = "Email already exists." });
        }

        // 2. Create the new User object
        var newUser = new User
        {
            FirstName = registerDto.FirstName,
            LastName = registerDto.LastName,
            Email = registerDto.Email,
            UserName = registerDto.Email, // Use email as username by default
            AddressLine1 = registerDto.AddressLine1,
            AddressLine2 = registerDto.AddressLine2,
            City = registerDto.City,
            PostCode = registerDto.PostCode,
            Country = registerDto.Country,
            EmailConfirmed = true // Set to true for now, implement email confirmation later if needed
        };

        // 3. Create the user using UserManager (handles password hashing)
        var result = await _userManager.CreateAsync(newUser, registerDto.Password);

        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            _logger.LogError("Registration failed for {Email}: {Errors}", registerDto.Email, errors);
            return BadRequest(new AuthResponseDto { IsSuccess = false, Message = $"Registration failed: {errors}" });
        }

        // 4. Assign a default role (e.g., "Member")
        // Ensure roles exist (ideally seeded, but check here just in case)
        if (!await _roleManager.RoleExistsAsync("Member"))
        {
            await _roleManager.CreateAsync(new IdentityRole("Member"));
            _logger.LogInformation("Created 'Member' role as it did not exist.");
        }
        await _userManager.AddToRoleAsync(newUser, "Member");

        _logger.LogInformation("User {Email} registered successfully.", registerDto.Email);

        // 5. Optionally: Generate token immediately upon registration or require login
        // For simplicity, we'll require them to log in separately after registration.
        return Ok(new AuthResponseDto
        {
            IsSuccess = true,
            Message = "User registered successfully. Please log in."
            // Optionally return limited user info here if needed
        });
    }


    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
    {
        _logger.LogInformation("Login attempt for {Email}", loginDto.Email);

        // 1. Find the user by email
        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.Email == loginDto.Email && !u.IsDeleted);
        if (user == null)
        {
             _logger.LogWarning("Login failed: User {Email} not found.", loginDto.Email);
            return Unauthorized(new AuthResponseDto { IsSuccess = false, Message = "Invalid email or password." });
        }

        // 2. Check the password
        // Set lockoutOnFailure: true to enable account lockout
        var result = await _signInManager.PasswordSignInAsync(user, loginDto.Password, isPersistent: false, lockoutOnFailure: true);

        if (!result.Succeeded)
        {
            string failureReason = "Invalid email or password.";
            if(result.IsLockedOut) {
                 failureReason = "Account locked out due to too many failed login attempts.";
                 _logger.LogWarning("Login failed: Account {Email} locked out.", loginDto.Email);
            } else if (result.IsNotAllowed) {
                 failureReason = "Login not allowed. (Account may need confirmation).";
                 _logger.LogWarning("Login failed: Account {Email} not allowed (e.g., needs confirmation).", loginDto.Email);
            } else {
                 _logger.LogWarning("Login failed: Invalid password for {Email}.", loginDto.Email);
            }
            return Unauthorized(new AuthResponseDto { IsSuccess = false, Message = failureReason });
        }

        // 3. Password is valid, generate JWT
        _logger.LogInformation("User {Email} logged in successfully.", loginDto.Email);
        var tokenDetails = await GenerateJwtToken(user);

        return Ok(new AuthResponseDto
        {
            IsSuccess = true,
            Message = "Login successful.",
            Token = tokenDetails.Token,
            TokenExpiration = tokenDetails.Expiration,
            UserInfo = tokenDetails.UserInfo
        });
    }


    // --- Helper Method to Generate JWT ---
    private async Task<(string Token, DateTime Expiration, UserInfoDto UserInfo)> GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var key = Encoding.ASCII.GetBytes(jwtSettings["Key"]!); // Use null-forgiving operator assuming validation at startup

        // Get user roles
        var roles = await _userManager.GetRolesAsync(user);

        // Create claims
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id), // Subject (standard user ID claim)
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()), // Unique token identifier
            new Claim(ClaimTypes.NameIdentifier, user.Id), // Common alternative for user ID
            new Claim(ClaimTypes.GivenName, user.FirstName),
            new Claim(ClaimTypes.Surname, user.LastName)
            // Add roles as claims
            // new Claim(ClaimTypes.Role, string.Join(",", roles)) // Simple comma-separated roles
        };

        // Add each role as a separate ClaimTypes.Role claim (preferred)
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(Convert.ToDouble(jwtSettings["HoursToExpire"] ?? "1")), // Token expiration (e.g., 1 hour) - make configurable
            Issuer = jwtSettings["Issuer"],
            Audience = jwtSettings["Audience"],
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        var jwtToken = tokenHandler.WriteToken(token);

        var userInfo = new UserInfoDto
        {
            UserId = user.Id,
            Email = user.Email!,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Roles = roles,
            AvatarUrl = user.AvatarUrl // <-- Populate this
        };

        return (jwtToken, token.ValidTo, userInfo);
    }
}