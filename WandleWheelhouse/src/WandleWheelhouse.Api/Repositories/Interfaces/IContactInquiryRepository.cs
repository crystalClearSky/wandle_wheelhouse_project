using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WandleWheelhouse.Api.Models;

namespace WandleWheelhouse.Api.Repositories.Interfaces
{
    public interface IContactInquiryRepository : IGenericRepository<ContactInquiry>
    {
        // Add any specific methods for ContactInquiries here if needed in the future
        // For now, IGenericRepository methods are sufficient.
    }
}