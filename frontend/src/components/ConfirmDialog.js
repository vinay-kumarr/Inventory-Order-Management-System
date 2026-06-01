import React from 'react';
import Modal from './Modal';

function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  message = 'Are you sure?',
  title = 'Confirm action',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  busy = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="confirm">
        <div className="confirm__icon" aria-hidden="true">!</div>
        <div className="confirm__title">{title}</div>
        <p className="confirm__message">{message}</p>
        <div className="confirm__actions">
          <button className="btn btn--secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button className="btn btn--danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
