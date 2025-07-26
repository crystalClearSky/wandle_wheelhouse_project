using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WandleWheelhouse.Api.Models;

namespace WandleWheelhouse.Api.Repositories.Interfaces;

public interface IDonationRepository : IGenericRepository<Donation>
{
    // Example specific method:
    Task<IEnumerable<Donation>> GetSuccessfulDonationsByUserAsync(string userId);
    Task<Donation?> GetByPaymentIntentIdAsync(string paymentIntentId);
}