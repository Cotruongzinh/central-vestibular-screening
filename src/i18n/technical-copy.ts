export function trackingStatusVi(value: string | null | undefined): string {
  switch (value) {
    case 'loading':
      return 'đang tải';
    case 'ready':
      return 'sẵn sàng';
    case 'error':
      return 'lỗi';
    case 'requesting':
      return 'đang xin quyền';
    case 'collecting':
      return 'đang thu mốc';
    case 'reset':
      return 'đã đặt lại';
    default:
      return value?.trim() || '...';
  }
}

export function trackingStageVi(value: string | null | undefined): string {
  switch (value) {
    case 'module':
      return 'mô-đun';
    case 'bundle':
      return 'gói thư viện';
    case 'wasm':
      return 'WASM';
    case 'model':
      return 'mô hình';
    default:
      return value?.trim() || '';
  }
}
