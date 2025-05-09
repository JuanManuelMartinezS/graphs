import React from 'react';

/**
 * Componente modal reutilizable para formularios de puntos en el mapa.
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.isOpen - Controla si el modal está visible
 * @param {function} props.onClose - Función para cerrar el modal
 * @param {function} props.onSubmit - Función para manejar el envío del formulario
 * @param {React.ReactNode} props.children - Contenido del modal (inputs, etc.)
 * @param {boolean} [props.disableSubmit=false] - Deshabilita el botón de guardar
 * @returns {JSX.Element|null} Elemento JSX del modal o null si no está abierto
 */
function PointModal({ isOpen, onClose, onSubmit, children, disableSubmit = false }) {
  // No renderizar si el modal no está abierto
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
        {/* Contenido personalizado del modal */}
        {children}
        
        {/* Botones de acción */}
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            aria-label="Cancelar y cerrar modal"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={disableSubmit}
            className={`px-4 py-2 rounded ${
              disableSubmit
                ? 'bg-blue-300 cursor-not-allowed text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            aria-label="Guardar cambios"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default PointModal;