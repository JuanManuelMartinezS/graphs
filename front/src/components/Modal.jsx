import React from 'react';

function Modal({ isOpen, onClose, onSubmit, children }) {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-0 flex items-center justify-center z-[1000]">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
          {children}
          <div className="mt-4 flex justify-end space-x-2">

          </div>
        </div>
      </div>
    );
  }

export default Modal;