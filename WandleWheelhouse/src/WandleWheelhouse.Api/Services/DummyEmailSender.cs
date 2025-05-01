using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace WandleWheelhouse.Api.Services;

public class DummyEmailSender : IEmailSender
{
    private readonly ILogger<DummyEmailSender> _logger;

    public DummyEmailSender(ILogger<DummyEmailSender> logger)
    {
        _logger = logger;
    }

    public Task SendEmailAsync(string toEmail, string subject, string htmlMessage)
    {
        // In a real app, use SendGrid, Mailgun, SES etc.
        _logger.LogWarning("--- DUMMY EMAIL SENDER ---");
        _logger.LogWarning("To: {Email}", toEmail);
        _logger.LogWarning("Subject: {Subject}", subject);
        // Log the body carefully in production to avoid logging sensitive info if any
        _logger.LogWarning("Body:\n{Body}", htmlMessage);
        _logger.LogWarning("--- END DUMMY EMAIL ---");

        // Simulate sending delay if needed
        // await Task.Delay(100);

        return Task.CompletedTask; // Return completed task
    }
}