import React, { useState, useEffect } from 'react';
import { reportService } from '../services/api';
import { Search, MapPin, Calendar, Tag, Package, PlusCircle, Sparkles, Upload, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

export default function BrowseCatalog({ onOpenReport }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [referenceImageFile, setReferenceImageFile] = useState(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState(null);
  const [referenceImagePath, setReferenceImagePath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    reportService.getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      executeSearch();
    }, 350);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedCategory, locationFilter, referenceImagePath]);

  const executeSearch = async () => {
    setSearching(true);
    try {
      if (!searchQuery && !referenceImagePath && !selectedCategory && !locationFilter) {
        // Default initial load: get all approved catalog items
        const res = await reportService.getFoundReports({ catalog: true });
        setItems(res.map(i => ({ ...i, similarity_score: null, match_type: 'catalog' })));
      } else {
        // Multi-modal semantic vector search
        const res = await reportService.searchCatalog({
          query: searchQuery.trim() || null,
          image_path: referenceImagePath || null,
          category: selectedCategory || null,
          location: locationFilter.trim() || null,
          min_score: 0.25,
        });
        setItems(res);
      }
    } catch (err) {
      console.error("Catalog search failed:", err);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setReferenceImageFile(file);
      setReferenceImagePreview(URL.createObjectURL(file));
      try {
        setSearching(true);
        const uploadRes = await reportService.uploadImage(file);
        setReferenceImagePath(uploadRes.image_url);
      } catch (err) {
        alert("Failed to upload reference photo for search");
        setReferenceImageFile(null);
        setReferenceImagePreview(null);
      } finally {
        setSearching(false);
      }
    }
  };

  const handleClearImage = () => {
    setReferenceImageFile(null);
    setReferenceImagePreview(null);
    setReferenceImagePath(null);
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>Security Desk Catalog</h1>
              <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Sparkles size={12} /> AI Semantic Search
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Browse items in custody at the campus security desk, or search using natural language & reference photos.
            </p>
          </div>
          <button onClick={() => onOpenReport('lost')} className="btn btn-primary">
            <PlusCircle size={18} /> Can't find yours? Report Lost
          </button>
        </div>

        {/* Search & Multi-modal controls */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) auto', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            {/* Natural language text query */}
            <div style={{ position: 'relative' }}>
              <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Describe your item in natural language (e.g. 'navy insulated bottle with sticker', 'keys with red tag')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>

            {/* Photo reference upload button */}
            <div>
              <label
                className="btn btn-outline"
                style={{
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                  borderColor: referenceImagePath ? 'var(--accent)' : 'var(--border)',
                  backgroundColor: referenceImagePath ? 'var(--accent-subtle)' : '#fff',
                }}
              >
                <Upload size={16} color={referenceImagePath ? 'var(--accent)' : 'var(--text-muted)'} />
                {referenceImagePath ? 'Change Photo' : 'Search by Photo'}
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Reference Photo Active Indicator */}
          {referenceImagePreview && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem 1rem',
                backgroundColor: 'var(--accent-subtle)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #fde68a',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src={referenceImagePreview} alt="Search Reference" style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: '4px', border: '1px solid #f59e0b' }} />
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-text)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={13} /> Visual Search Active
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Matching items using OpenCLIP visual feature vectors
                  </div>
                </div>
              </div>
              <button
                onClick={handleClearImage}
                className="btn btn-sm btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: 'var(--rose)', borderColor: 'var(--border)' }}
              >
                <X size={14} /> Clear Photo
              </button>
            </div>
          )}

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            <button
              onClick={() => setSelectedCategory('')}
              className="btn btn-sm"
              style={{
                backgroundColor: !selectedCategory ? 'var(--primary)' : '#fff',
                color: !selectedCategory ? '#fff' : 'var(--text-main)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                whiteSpace: 'nowrap',
              }}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                className="btn btn-sm"
                style={{
                  backgroundColor: selectedCategory === cat ? 'var(--primary)' : '#fff',
                  color: selectedCategory === cat ? '#fff' : 'var(--text-main)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-full)',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {loading || searching ? (
        <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
          <Sparkles size={32} color="var(--accent)" style={{ animation: 'spin 2s linear infinite', marginBottom: '0.75rem' }} />
          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Analyzing semantic vector embeddings...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <Package size={44} color="var(--text-light)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Matching Items Found</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 1.5rem' }}>
            None of the items currently in safe keeping match your search criteria. You can submit a Lost Item report to be automatically notified when someone turns it in.
          </p>
          <button onClick={() => onOpenReport('lost')} className="btn btn-primary">
            <PlusCircle size={16} /> File a Lost Item Report
          </button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 600 }}>
            Showing {items.length} item{items.length !== 1 ? 's' : ''} at Security Desk
            {(searchQuery || referenceImagePath) && ' ranked by AI similarity score'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {items.map((item) => {
              const scorePct = item.similarity_score ? Math.round(item.similarity_score * 100) : null;
              return (
                <div key={item.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                  {/* Top badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span className="badge badge-amber">{item.category}</span>
                    {scorePct ? (
                      <div className="ai-score-pill" title={`Match type: ${item.match_type}`}>
                        <Sparkles size={12} color="#fbbf24" />
                        <span className="score-number">{scorePct}%</span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {item.match_type === 'hybrid' ? 'hybrid' : item.match_type === 'image' ? 'photo' : 'text'}
                        </span>
                      </div>
                    ) : (
                      <span className="badge badge-blue">At Desk</span>
                    )}
                  </div>

                  {/* Image preview if available */}
                  {item.image_path && (
                    <div style={{ marginBottom: '0.75rem', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img src={item.image_path} alt={item.item_name} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                    </div>
                  )}

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.4rem' }}>{item.item_name}</h3>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '1rem', flex: 1 }}>{item.description}</p>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={13} /> Found at: {item.location_found}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={13} /> {item.date_found || 'Recently turned in'}</div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-light)' }}>#{item.report_number}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--emerald-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={13} /> Available for Pickup
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

