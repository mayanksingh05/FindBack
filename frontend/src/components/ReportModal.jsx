import React, { useState, useEffect } from 'react';
import { reportService } from '../services/api';
import { X, Upload, PlusCircle, Image as ImageIcon } from 'lucide-react';

export default function ReportModal({ type = 'lost', isOpen, onClose, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    category: '', item_name: '', description: '', location: '',
    location_unknown: false, date: new Date().toISOString().split('T')[0],
    distinguishing_info: '', image_path: null,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      reportService.getCategories().then(setCategories).catch(console.error);
      setError('');
      setImageFile(null);
      setImagePreview(null);
      setFormData({ category: '', item_name: '', description: '', location: '', location_unknown: false, date: new Date().toISOString().split('T')[0], distinguishing_info: '', image_path: null });
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const isLost = type === 'lost';

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.item_name || !formData.description) {
      setError('Please fill in Category, Item Name, and Description.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let imagePath = null;
      if (imageFile) {
        setUploading(true);
        const uploadRes = await reportService.uploadImage(imageFile);
        imagePath = uploadRes.image_url;
        setUploading(false);
      }

      if (isLost) {
        await reportService.createLostReport({
          category: formData.category, item_name: formData.item_name,
          description: formData.description,
          location: formData.location_unknown ? null : formData.location,
          location_unknown: formData.location_unknown,
          date_lost: formData.date,
          distinguishing_info: formData.distinguishing_info,
          image_path: imagePath,
        });
      } else {
        await reportService.createFoundReport({
          category: formData.category, item_name: formData.item_name,
          description: formData.description,
          location_found: formData.location || 'Campus',
          date_found: formData.date,
          image_path: imagePath,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit report.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
              {isLost ? 'Report a Lost Item' : 'Report a Found Item'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {isLost ? 'Describe what you lost. AI will search the found items catalog.' : 'Describe what you found. Admin will review once item is handed to security desk.'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {error && <div style={{ padding: '0.75rem', backgroundColor: 'var(--rose-subtle)', color: 'var(--rose-text)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required>
                <option value="">Select...</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Item Name *</label>
              <input type="text" className="form-input" placeholder="e.g. Blue JBL Earbuds" value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-textarea" rows={3} placeholder="Color, brand, distinguishing marks..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{isLost ? 'Location Lost' : 'Location Found *'}</label>
              <input type="text" className="form-input" placeholder="e.g. Library 2nd Floor" disabled={isLost && formData.location_unknown} value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
              {isLost && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', marginTop: '0.3rem', color: 'var(--text-muted)' }}>
                  <input type="checkbox" checked={formData.location_unknown} onChange={(e) => setFormData({ ...formData, location_unknown: e.target.checked })} />
                  I don't remember where
                </label>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Date {isLost ? 'Lost' : 'Found'}</label>
              <input type="date" className="form-input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
          </div>

          {/* Image Upload */}
          <div className="form-group">
            <label className="form-label">
              <ImageIcon size={14} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: '-2px' }} />
              Photo of Item (Optional)
            </label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '120px', height: '100px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: '#f8fafc', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                <Upload size={20} color="var(--text-light)" style={{ marginBottom: '0.3rem' }} />
                {uploading ? 'Uploading...' : 'Click to upload'}
                <input type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={handleImageChange} />
              </label>
              {imagePreview && (
                <img src={imagePreview} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
              )}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
              {isLost ? 'If you have a photo, AI matching accuracy improves significantly.' : 'Take a photo of the item so the owner can visually verify it.'}
            </span>
          </div>

          {isLost && (
            <div className="form-group">
              <label className="form-label">Private Proof of Ownership</label>
              <input type="text" className="form-input" placeholder="e.g. Specific sticker on back, custom wallpaper..." value={formData.distinguishing_info} onChange={(e) => setFormData({ ...formData, distinguishing_info: e.target.value })} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>Only shown to admin for identity verification. Not visible publicly.</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <PlusCircle size={16} /> {loading ? 'Submitting...' : isLost ? 'Submit Lost Report' : 'Submit Found Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
