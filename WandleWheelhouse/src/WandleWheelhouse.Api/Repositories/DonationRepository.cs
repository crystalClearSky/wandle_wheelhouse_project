using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WandleWheelhouse.Api.Data;
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.Repositories.Interfaces;

namespace WandleWheelhouse.Api.Repositories;

public class DonationRepository : GenericRepository<Donation>, IDonationRepository
{
    public DonationRepository(ApplicationDbContext context) : base(context) { }

    public async Task<IEnumerable<Donation>> GetSuccessfulDonationsByUserAsync(string userId)
    {
        return await _dbSet
            .Where(d => d.UserId == userId && d.Status == PaymentStatus.Success)
            .OrderByDescending(d => d.DonationDate)
            .ToListAsync();
    }
    // Implement other specific methods
}