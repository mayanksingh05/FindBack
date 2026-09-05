import React, { useState, useEffect } from 'react';
import { reportService } from '../services/api';
import { Search, MapPin, Calendar, Tag, Package, PlusCircle } from 'lucide-react';

export default function BrowseCatalog({ onOpenReport }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCatalog(); }, [selectedCategory]);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const [cats, found] = await Promise.all([
        reportService.getCategories(),
        reportService.getFoundReports({ catalog: true, ...(selectedCategory ? { category: selectedCategory } : {}) }),
      ]);
      setCategories(cats);
      setItems(found);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = items.filter((i) => {
    const q = searchQuery.toLowerCase();
    return i.item_name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.location_found.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
  });

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>Found Items Catalog</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Items currently held at the campus security desk, available for claiming.</p>
          </div>
          <button onClick={() => onOpenReport('lost')} className="btn btn-primary"><PlusCircle size={18} /> Can't find yours? Report Lost</button>
        </div>

        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" className="form-input" placeholder="Search by name, color, location..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: '2.75rem' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <button onClick={() => setSelectedCategory('')} className="btn btn-sm" style={{ backgroundColor: !selectedCategory ? 'var(--primary)' : '#fff', color: !selectedCategory ? '#fff' : 'var(--text-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}>All</button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className="btn btn-sm" style={{ backgroundColor: selectedCategory === cat ? 'var(--primary)' : '#fff', color: selectedCategory === cat ? '#fff' : 'var(--text-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}>{cat}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div> :
        filtered.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <Package size={40} color="var(--text-light)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Items Found</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No items match your search.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {filtered.map((item) => (
              <div key={item.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span className="badge badge-amber">{item.category}</span>
                  <span className="badge badge-blue">At Security Desk</span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>{item.item_name}</h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '1rem' }}>{item.description}</p>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={13} /> {item.location_found}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={13} /> {item.date_found || 'Recent'}</div>
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-light)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>#{item.report_number}</span>
                  <span style={{ color: 'var(--emerald-text)', fontWeight: 600 }}>Available for Pickup</span>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
