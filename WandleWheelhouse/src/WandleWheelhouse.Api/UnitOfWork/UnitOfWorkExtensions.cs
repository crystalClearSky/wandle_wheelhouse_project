using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace WandleWheelhouse.Api.UnitOfWork
{
    public static class UnitOfWorkExtensions
    {
        public static Data.ApplicationDbContext GetContext(this IUnitOfWork unitOfWork)
        {
            // This requires UnitOfWork implementation to expose its context, or use casting/reflection (less ideal)
            // Add a property `ApplicationDbContext Context { get; }` to IUnitOfWork and UnitOfWork.cs
            // return unitOfWork.Context; // Assuming Context property exists

            // Alternative (if UoW class is known and context is accessible, less clean):
            if (unitOfWork is UnitOfWork concreteUoW)
            {
                // Requires making _context field protected or adding a public getter in UnitOfWork class
                // return concreteUoW.GetDbContext(); // Add a method GetDbContext() { return _context; } to UnitOfWork
                throw new InvalidOperationException("Cannot access DbContext directly in this manner without modification.");
            }
            throw new InvalidOperationException("Could not get DbContext from IUnitOfWork.");
        }
    }
}