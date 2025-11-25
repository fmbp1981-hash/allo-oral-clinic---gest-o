import { useState, useCallback } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  loading: boolean;
  onConfirm: () => void;
}

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    loading: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {},
  });

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmState({
          isOpen: true,
          loading: false,
          ...options,
          onConfirm: async () => {
            setConfirmState((prev) => ({ ...prev, loading: true }));
            resolve(true);
            setTimeout(() => {
              setConfirmState((prev) => ({ ...prev, isOpen: false, loading: false }));
            }, 300);
          },
        });

        // Setup reject on close
        const handleClose = () => {
          resolve(false);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        };

        // Store close handler
        (setConfirmState as any).closeHandler = handleClose;
      });
    },
    []
  );

  const closeConfirm = useCallback(() => {
    if ((setConfirmState as any).closeHandler) {
      (setConfirmState as any).closeHandler();
    }
  }, []);

  return {
    confirm,
    confirmState,
    closeConfirm,
  };
};
