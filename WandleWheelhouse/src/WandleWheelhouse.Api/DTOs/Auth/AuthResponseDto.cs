using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace WandleWheelhouse.Api.DTOs.Auth;

#nullable enable
public class AuthResponseDto
{
    public bool IsSuccess { get; set; }
    public string? Message { get; set; }
    public string? Token { get; set; } // The JWT
    public DateTime? TokenExpiration { get; set; }
    public UserInfoDto? UserInfo { get; set; }
}

public class UserInfoDto
{
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public IList<string> Roles { get; set; } = new List<string>();
}
#nullable disable