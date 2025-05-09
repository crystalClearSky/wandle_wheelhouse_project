# Location: src/WandleWheelhouse.Api/Dockerfile

# --- Stage 1: Build ---
# Use the official .NET SDK image matching your project's target framework (e.g., 8.0)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
WORKDIR /app

# Copy csproj files first for layer caching
# Copy the main API project file
COPY src/WandleWheelhouse.Api/*.csproj ./src/WandleWheelhouse.Api/
# Copy other potential project files if they exist (Models, DataAccess etc.)
# Adjust paths as needed if you have separate class library projects
# COPY src/WandleWheelhouse.Models/*.csproj ./src/WandleWheelhouse.Models/
# COPY src/WandleWheelhouse.DataAccess/*.csproj ./src/WandleWheelhouse.DataAccess/

# Restore dependencies for the API project
RUN dotnet restore "./src/WandleWheelhouse.Api/WandleWheelhouse.Api.csproj"

# Copy the entire solution source code
COPY . ./

# Publish the API project in Release configuration
RUN dotnet publish "./src/WandleWheelhouse.Api/WandleWheelhouse.Api.csproj" -c Release -o /app/publish --no-restore /p:UseAppHost=false

# --- Stage 2: Runtime ---
# Use the official ASP.NET Core runtime image matching the SDK version
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copy the published output from the build stage
COPY --from=build-env /app/publish .

# Expose the port the application will listen on inside the container
# This should match the port Kestrel is configured to listen on (often 80 or 8080 for HTTP)
# Your launchSettings.json uses 7136 (HTTPS) and 5041 (HTTP), but often inside container we use a standard non-SSL port like 8080
# Let's assume Kestrel will listen on 8080 for HTTP within the container
EXPOSE 8080
# You might need to configure Kestrel to listen on this port via appsettings.json or environment variables if it defaults elsewhere

# Define the entry point for the container
ENTRYPOINT ["dotnet", "WandleWheelhouse.Api.dll"]