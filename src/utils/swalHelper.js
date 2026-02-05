import Swal from "sweetalert2";

/**
 * ฟังก์ชันแจ้งเตือนอเนกประสงค์
 * @param {string} title - หัวข้อ
 * @param {string} text - รายละเอียด
 * @param {string} icon - 'success', 'error', 'warning', 'info'
 */
export const showAlert = async (title, text, icon = 'success') => {
  const colors = {
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8'
  };

  return Swal.fire({
    icon: icon,
    title: `<span style='color:${colors[icon]}; font-weight:600;'>${title}</span>`,
    html: `<div style='font-size: 0.95rem;'>${text}</div>`,
    timer: icon === 'success' ? 1800 : 3000, // ถ้าสำเร็จให้ปิดเร็ว ถ้าพลาดให้แช่นานหน่อย
    timerProgressBar: true,
    showConfirmButton: icon !== 'success', // ถ้า error ให้มีปุ่มกดปิดเอง
    confirmButtonColor: colors[icon],
    background: "#fff",
    customClass: {
      popup: 'rounded-4 shadow-lg border-0',
    },
    showClass: {
      popup: 'animate__animated animate__fadeInUp animate__faster'
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOutDown animate__faster'
    }
  });
};