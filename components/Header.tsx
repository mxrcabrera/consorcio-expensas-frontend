import { FileSpreadsheet, Building2, History } from 'lucide-react';
import { Edificio } from '@/types';

interface HeaderProps {
  onOpenExcel: () => void;
  onOpenHistorial: () => void;
  edificios: Edificio[];
  selectedEdificioId: string | null;
  onSelectEdificio: (id: string) => void;
  onManageEdificios: () => void;
}

export default function Header({
  onOpenExcel,
  onOpenHistorial,
  edificios,
  selectedEdificioId,
  onSelectEdificio,
  onManageEdificios,
}: HeaderProps) {
  const selectedEdificio = edificios.find(e => e.id === selectedEdificioId);
  const displayName = selectedEdificio?.nombre || 'Consorcio Expensas';

  return (
    <header className="consorcio-header">
      <div className="header-container">
        <div className="header-brand">
          <div className="consorcio-logo">
            <span className="logo-text">{displayName.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="header-title">{displayName}</h1>
            <p className="header-subtitle">Sistema de Envio de Notificaciones</p>
          </div>
        </div>

        <div className="header-actions">
          {/* Selector solo si hay más de 1 edificio */}
          {edificios.length > 1 && (
            <select
              value={selectedEdificioId || ''}
              onChange={(e) => onSelectEdificio(e.target.value)}
              className="header-building-select"
            >
              {edificios.map((edificio) => (
                <option key={edificio.id} value={edificio.id}>
                  {edificio.nombre}
                </option>
              ))}
            </select>
          )}
          <button onClick={onManageEdificios} className="btn-secondary-consorcio">
            <Building2 className="w-4 h-4" />
            Edificios
          </button>
          <button onClick={onOpenHistorial} className="btn-secondary-consorcio">
            <History className="w-4 h-4" />
            Historial
          </button>
          <button onClick={onOpenExcel} className="btn-secondary-consorcio">
            <FileSpreadsheet className="w-4 h-4" />
            Ver datos
          </button>
        </div>
      </div>
    </header>
  );
}
