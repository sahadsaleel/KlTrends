type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type SweetAlert = {
  fire: (options: Record<string, unknown>) => Promise<{ isConfirmed: boolean; isDismissed: boolean }>;
};

declare global {
  interface Window {
    Swal?: SweetAlert;
  }
}

let sweetAlertPromise: Promise<SweetAlert> | null = null;

const loadSweetAlert = (): Promise<SweetAlert> => {
  if (window.Swal) return Promise.resolve(window.Swal);
  if (sweetAlertPromise) return sweetAlertPromise;

  sweetAlertPromise = new Promise((resolve, reject) => {
    if (!document.getElementById('sweetalert2-styles')) {
      const stylesheet = document.createElement('link');
      stylesheet.id = 'sweetalert2-styles';
      stylesheet.rel = 'stylesheet';
      stylesheet.href = 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css';
      document.head.appendChild(stylesheet);
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js';
    script.onload = () => window.Swal ? resolve(window.Swal) : reject(new Error('SweetAlert2 did not load.'));
    script.onerror = () => reject(new Error('Unable to load SweetAlert2.'));
    document.head.appendChild(script);
  });

  return sweetAlertPromise;
};

const alertIcon = (title: string): 'success' | 'error' | 'warning' | 'info' | 'question' => {
  const normalized = title.toLowerCase();
  if (normalized.includes('success') || normalized.includes('saved') || normalized.includes('deleted')) return 'success';
  if (normalized.includes('error') || normalized.includes('failed')) return 'error';
  if (normalized.includes('validation') || normalized.includes('required') || normalized.includes('notice')) return 'warning';
  if (normalized.includes('confirm') || normalized.includes('sign out') || normalized.includes('delete')) return 'question';
  return 'info';
};

export const AppAlert = {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => {
    const cancelButton = buttons?.find((button) => button.style === 'cancel');
    const nonCancelButtons = buttons?.filter((button) => button.style !== 'cancel') || [];
    const confirmButton = nonCancelButtons[nonCancelButtons.length - 1];

    void loadSweetAlert()
      .then((Swal) => Swal.fire({
        title,
        text: message,
        icon: alertIcon(title),
        showCancelButton: Boolean(cancelButton),
        confirmButtonText: confirmButton?.text || 'OK',
        cancelButtonText: cancelButton?.text || 'Cancel',
        confirmButtonColor: confirmButton?.style === 'destructive' ? '#DC2626' : '#570490',
        cancelButtonColor: '#6B7280',
        reverseButtons: true,
        focusCancel: Boolean(cancelButton),
        buttonsStyling: true,
      }))
      .then((result) => {
        if (result.isConfirmed) confirmButton?.onPress?.();
        else if (result.isDismissed) cancelButton?.onPress?.();
      })
      .catch(() => window.alert([title, message].filter(Boolean).join('\n\n')));
  },
};
