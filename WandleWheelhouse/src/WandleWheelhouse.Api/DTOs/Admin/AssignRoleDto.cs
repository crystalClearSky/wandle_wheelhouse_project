using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;

namespace WandleWheelhouse.Api.DTOs.Admin;

public class AssignRoleDto
{
    [Required]
    public string RoleName { get; set; } = string.Empty;
}