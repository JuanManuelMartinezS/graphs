import React from 'react';

function PointModal({ isOpen, onClose, onSubmit, children }) {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
          {children}
          <div className="mt-4 flex justify-end space-x-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancelar
            </button>
            <button 
              onClick={onSubmit}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    );
  }

export default PointModal;