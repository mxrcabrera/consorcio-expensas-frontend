import { FileSpreadsheet } from 'lucide-react';

interface HeaderProps {
  onOpenExcel: () => void;
}

export default function Header({ onOpenExcel }: HeaderProps) {
  return (
    <header className="consorcio-header">
      <div className="header-container">
        <div className="header-brand">
          <div className="consorcio-logo">
            <span className="logo-text">C</span>
          </div>
          <div>
            <h1 className="header-title">Consorcio Expensas</h1>
            <p className="header-subtitle">Sistema de Envío de Notificaciones</p>
          </div>
        </div>

        <button onClick={onOpenExcel} className="btn-secondary-consorcio">
          <FileSpreadsheet className="w-4 h-4" />
          Gestionar Excel
        </button>
      </div>
    </header>
  );
}