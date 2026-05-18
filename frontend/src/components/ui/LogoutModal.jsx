import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { LogOut, X } from 'lucide-react';
import Overlay from './Overlay';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  const handleClose = (e) => {
    e?.stopPropagation();
    onClose();
  };

  const handleConfirm = (e) => {
    e?.stopPropagation();
    onConfirm();
  };

  useEffect(() => {
    if (isOpen) {
      const handleEnter = (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onConfirm();
        }
      };

      document.addEventListener('keydown', handleEnter);

      return () => {
        document.removeEventListener('keydown', handleEnter);
      };
    }

    return undefined;
  }, [isOpen, onConfirm]);

  if (!isOpen) return null;

  return (
    <Overlay
      isOpen={isOpen}
      onClose={handleClose}
      containerClassName="z-[99999]"
      backdropClassName="bg-black/70 backdrop-blur-sm"
      panelClassName="max-w-md"
      ariaLabelledBy="logout-modal-title"
    >
      <div 
        className="relative w-full max-w-md m-auto transform transition-all duration-300 scale-100 opacity-100"
      >
        {/* Modal card */}
        <div className="relative rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)' }}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" style={{ color: '#9CA3AF' }} />
          </button>

          {/* Header — dark gradient matching dashboard header band */}
          <div className="px-6 py-6" style={{ background: 'linear-gradient(135deg, #0F172A, #020617)' }}>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.30)' }}>
                <LogOut className="w-6 h-6" style={{ color: '#3B82F6' }} />
              </div>
              <div>
                <h2 id="logout-modal-title" className="text-xl font-bold" style={{ color: '#F9FAFB' }}>
                  Confirm Logout
                </h2>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6" style={{ background: '#0D1117' }}>
            <div className="mb-6">
              <p className="text-lg font-semibold mb-2" style={{ color: '#F9FAFB' }}>
                Are you sure you want to logout?
              </p>
              <p style={{ color: '#9CA3AF' }}>
                Your session will be ended and you'll need to login again to access your account.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6" style={{ background: '#0D1117' }}>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-6 py-3 font-semibold rounded-xl transition-colors"
                style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.10)', color: '#9CA3AF' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-6 py-3 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                style={{ background: '#3B82F6' }}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
};

LogoutModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default LogoutModal;