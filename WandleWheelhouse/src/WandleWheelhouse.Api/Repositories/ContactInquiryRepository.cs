// src/WandleWheelhouse.Api/Repositories/ContactInquiryRepository.cs
using WandleWheelhouse.Api.Data;
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.Repositories.Interfaces;

namespace WandleWheelhouse.Api.Repositories
{
    public class ContactInquiryRepository : GenericRepository<ContactInquiry>, IContactInquiryRepository
    {
        public ContactInquiryRepository(ApplicationDbContext context) : base(context)
        {
        }
        // Implement any specific methods from IContactInquiryRepository here
    }
}