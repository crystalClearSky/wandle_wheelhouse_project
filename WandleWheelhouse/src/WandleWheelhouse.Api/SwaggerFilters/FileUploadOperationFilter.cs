using Microsoft.AspNetCore.Http;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Linq;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using System; // Add for Console.WriteLine and StringComparison

namespace WandleWheelhouse.Api.SwaggerFilters
{
    public class FileUploadOperationFilter : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
{
    var path = context.ApiDescription.RelativePath;
    var method = context.ApiDescription.HttpMethod;

    // Directly target the specific path and method
    if (path != null && path.Equals("api/Users/me/avatar", StringComparison.OrdinalIgnoreCase) &&
        method != null && method.Equals("POST", StringComparison.OrdinalIgnoreCase))
    {
        Console.WriteLine($"Filter forcefully modifying request body for: {path}"); // Log

        // Ensure RequestBody and Content structure exists
        operation.RequestBody ??= new OpenApiRequestBody();
        operation.RequestBody.Content ??= new Dictionary<string, OpenApiMediaType>();

        // Define the correct schema directly, using "file" as the parameter name
        var correctSchema = new OpenApiSchema
        {
            Type = "object",
            Properties =
            {
                ["file"] = new OpenApiSchema // Hardcode parameter name "file"
                {
                    Type = "string",
                    Format = "binary"       // This indicates a file upload
                }
            },
            Required = new HashSet<string> { "file" } // Mark "file" as required
        };

        // Add or overwrite the multipart/form-data definition ONLY
        operation.RequestBody.Content["multipart/form-data"] = new OpenApiMediaType
        {
            Schema = correctSchema
        };

        // Optional: Remove any other incorrect content types Swashbuckle might have added
        var keysToRemove = operation.RequestBody.Content.Keys
                                .Where(k => k != "multipart/form-data")
                                .ToList();
        foreach(var key in keysToRemove) {
            operation.RequestBody.Content.Remove(key);
            Console.WriteLine($"Filter removed incorrect content type '{key}' for {path}"); // Log removal
        }

         Console.WriteLine($"Filter Applied: Forcefully Modified RequestBody for {path}");
    }
     // Optional: Log paths that didn't match if needed for debugging other endpoints
     // else {
     //     Console.WriteLine($"Filter skipping path: {path}");
     // }
}
    }
}