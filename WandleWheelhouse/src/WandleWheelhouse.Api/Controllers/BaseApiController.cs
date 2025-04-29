using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace WandleWheelhouse.Api.Controllers;

[ApiController] // Enables API-specific behaviors like automatic model validation responses
[Route("api/[controller]")] // Defines the route template: e.g., /api/Auth
public class BaseApiController : ControllerBase
{
    // You can add common helper methods or properties here if needed later
}