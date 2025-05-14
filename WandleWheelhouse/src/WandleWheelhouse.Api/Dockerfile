# Location: src/WandleWheelhouse.Api/Dockerfile

# --- Stage 1: Build ---
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build-env
WORKDIR /app

# Copy csproj files first for layer caching
COPY src/WandleWheelhouse.Api/*.csproj ./src/WandleWheelhouse.Api/
# If you have other project references (e.g., Models, DataAccess), copy their .csproj files too
# e.g., COPY src/WandleWheelhouse.Models/*.csproj ./src/WandleWheelhouse.Models/

RUN dotnet restore "./src/WandleWheelhouse.Api/WandleWheelhouse.Api.csproj"

# Copy the entire solution source code (or just the src folder if preferred)
COPY . ./
# If copying only src: COPY src/. ./src/

# Publish the API project for linux-arm64
RUN dotnet publish "./src/WandleWheelhouse.Api/WandleWheelhouse.Api.csproj" \
    -c Release \
    -r linux-arm64 \
    --no-self-contained \
    -o /app/publish \
    /p:UseAppHost=false

# --- Stage 2: Runtime ---
# Use an ARM64-compatible ASP.NET Core runtime image based on Alpine
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine-arm64v8 AS runtime
WORKDIR /app

# --- Remove SQLite libs, Add PostgreSQL Client Libraries for Alpine ---
# RUN apk add --no-cache sqlite-libs # Remove this if it was present
RUN apk update && apk add --no-cache postgresql-libs
# --- End Library Change ---

# Copy the published output from the build stage
COPY --from=build-env /app/publish .

# Expose the port the application will listen on (e.g., 80, matching ASPNETCORE_URLS in .env)
EXPOSE 80

# Define the entry point for the container
ENTRYPOINT ["dotnet", "WandleWheelhouse.Api.dll"]