using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Linq.Expressions;

namespace WandleWheelhouse.Api.Repositories.Interfaces;

public interface IGenericRepository<T> where T : class
{
    Task<T?> GetByIdAsync(object id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate);
    Task AddAsync(T entity);
    Task AddRangeAsync(IEnumerable<T> entities);
    void Remove(T entity); // Typically synchronous remove, SaveChangesAsync makes it async
    void RemoveRange(IEnumerable<T> entities);
    void Update(T entity); // Mark as modified
    // Add other common methods as needed (e.g., CountAsync)
}