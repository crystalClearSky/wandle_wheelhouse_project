using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace WandleWheelhouse.Api.Services;

public interface IEmailSender
{
    Task SendEmailAsync(string toEmail, string subject, string htmlMessage);
}