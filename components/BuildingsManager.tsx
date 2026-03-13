'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Building2, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Edificio } from '@/types';

interface BuildingsManagerProps {
  show: boolean;
  onClose: () => void;
  onEdificioCreated: (edificio: Edificio) => void;
  onEdificioUpdated: (edificio: Edificio) => void;
  onEdificioDeleted: (id: string) => void;
}

interface FormData {
  nombre: string;
  direccion: string;
  nombre_remitente: string;
  email_remitente: string;
}

const emptyForm: FormData = {
  nombre: '',
  direccion: '',
  nombre_remitente: '',
  email_remitente: '',
};

export default function BuildingsManager({
  show,
  onClose,
  onEdificioCreated,
  onEdificioUpdated,
  onEdificioDeleted,
}: BuildingsManagerProps) {
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guarda si es primer setup (sin edificios al cargar)
  const isFirstSetup = useRef(false);

  useEffect(() => {
    if (show) {
      loadEdificios();
    } else {
      // Reset state al cerrar
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);
      setError(null);
      isFirstSetup.current = false;
    }
  }, [show]);

  const loadEdificios = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/buildings');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setEdificios(data.data);
        // Si no hay edificios, es primer setup
        if (data.data.length === 0) {
          isFirstSetup.current = true;
          setShowForm(true);
        }
      }
    } catch (err) {
      console.error('Error loading edificios:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): string | null => {
    if (!formData.nombre.trim()) {
      return 'El nombre del edificio es requerido';
    }
    if (!formData.direccion.trim()) {
      return 'La dirección es requerida';
    }
    if (!formData.nombre_remitente.trim()) {
      return 'El nombre del remitente es requerido';
    }
    if (!formData.email_remitente.trim()) {
      return 'El email del remitente es requerido';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email_remitente.trim())) {
      return 'El email no tiene un formato valido';
    }
    return null;
  };

  const handleCreate = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok && res.status >= 500) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success) {
        setEdificios([...edificios, data.data]);
        onEdificioCreated(data.data);
        setFormData(emptyForm);
        setShowForm(false);
      } else {
        setError(data.error || 'Error al crear edificio');
      }
    } catch {
      setError('Error al crear edificio');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/buildings/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok && res.status >= 500) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success) {
        setEdificios(edificios.map((e) => (e.id === editingId ? data.data : e)));
        onEdificioUpdated(data.data);
        setFormData(emptyForm);
        setEditingId(null);
        setShowForm(false);
      } else {
        setError(data.error || 'Error al actualizar edificio');
      }
    } catch {
      setError('Error al actualizar edificio');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este edificio?')) return;

    try {
      const res = await fetch(`/api/buildings/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status >= 500) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success) {
        setEdificios(edificios.filter((e) => e.id !== id));
        onEdificioDeleted(id);
      } else {
        setError(data.error || 'Error al eliminar edificio');
      }
    } catch {
      setError('Error al eliminar edificio');
    }
  };

  const startEdit = (edificio: Edificio) => {
    setFormData({
      nombre: edificio.nombre,
      direccion: edificio.direccion || '',
      nombre_remitente: edificio.nombre_remitente,
      email_remitente: edificio.email_remitente || '',
    });
    setEditingId(edificio.id);
    setShowForm(true);
    setError(null);
  };

  const startCreate = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError(null);
  };

  if (!show) return null;

  const handleOverlayClick = () => {
    // No cerrar si es primer setup
    if (isFirstSetup.current) {
      return;
    }
    onClose();
  };

  const handleBack = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    setError(null);
  };

  // Determinar título y navegación
  const getTitle = () => {
    if (isFirstSetup.current) return 'Configurar edificio';
    if (showForm && editingId) return 'Editar edificio';
    if (showForm) return 'Nuevo edificio';
    return 'Gestionar Edificios';
  };

  // Mostrar botón volver si estamos en form y no es primer setup
  const showBackButton = showForm && !isFirstSetup.current;
  // Mostrar X solo si no es primer setup
  const showCloseButton = !isFirstSetup.current;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal-container buildings-manager"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <div className="modal-header">
          {showBackButton && (
            <button onClick={handleBack} className="modal-back-btn">
              <ArrowLeft className="w-5 h-5 text-mineral-taupe" />
            </button>
          )}
          <h3 className="modal-title">
            <Building2 className="w-5 h-5 text-gold-vein" />
            {getTitle()}
          </h3>
          {showCloseButton && (
            <button onClick={onClose} className="modal-close-btn">
              <X className="w-5 h-5 text-mineral-taupe" />
            </button>
          )}
        </div>

        <div className="buildings-content">
          {loading ? (
            <div className="buildings-loading">Cargando...</div>
          ) : showForm ? (
            <div className="building-form">
              {error && <div className="form-error">{error}</div>}

              <div className="form-group">
                <label>Nombre del edificio *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Consorcio Constitución 2226"
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label>Dirección *</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Ej: Constitución 2226, CABA"
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label>Nombre del remitente *</label>
                <input
                  type="text"
                  value={formData.nombre_remitente}
                  onChange={(e) => setFormData({ ...formData, nombre_remitente: e.target.value })}
                  placeholder="Nombre que aparece en el email"
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label>Email del remitente {!editingId && '*'}</label>
                <input
                  type="email"
                  value={formData.email_remitente}
                  onChange={(e) => setFormData({ ...formData, email_remitente: e.target.value })}
                  placeholder="consorcio@gmail.com"
                  className="modal-input"
                  disabled={!!editingId}
                  style={editingId ? { backgroundColor: '#f5f5f4', cursor: 'not-allowed' } : undefined}
                />
                {editingId && (
                  <p className="form-hint">El email está vinculado al token OAuth y no se puede modificar</p>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={editingId ? handleUpdate : handleCreate}
                  className="modal-btn-confirm"
                  disabled={saving}
                  style={{ width: '100%' }}
                >
                  {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear edificio'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="buildings-list">
                {edificios.length === 0 ? (
                  <div className="buildings-empty">
                    <Building2 className="w-12 h-12 text-mineral-taupe opacity-50" />
                    <p>No hay edificios configurados</p>
                  </div>
                ) : (
                  edificios.map((edificio) => (
                    <div key={edificio.id} className="building-item">
                      <div className="building-info">
                        <h4>{edificio.nombre}</h4>
                        {edificio.direccion && <p>{edificio.direccion}</p>}
                      </div>
                      <div className="building-actions">
                        <button
                          onClick={() => startEdit(edificio)}
                          className="building-action-btn"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(edificio.id)}
                          className="building-action-btn delete"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button onClick={startCreate} className="btn-add-building">
                <Plus className="w-4 h-4" />
                Agregar edificio
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
