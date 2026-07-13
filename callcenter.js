const departments = [
  { icon: "🛍️", name: "Sales & Orders", description: "Help with products, orders and checkout.", hours: "Mon–Sat, 8:00 AM–6:00 PM", phone: "+256700000010" },
  { icon: "🚚", name: "Delivery Support", description: "Questions about delivery and order progress.", hours: "Mon–Sat, 8:00 AM–6:00 PM", phone: "+256700000011" },
  { icon: "🔧", name: "Worker Services", description: "Help finding and contacting manual workers.", hours: "Daily, 8:00 AM–7:00 PM", phone: "+256700000012" },
  { icon: "💬", name: "Customer Care", description: "General account, shopping and platform assistance.", hours: "Daily, 8:00 AM–8:00 PM", phone: "+256700000013" }
];

const departmentsContainer = document.getElementById("departmentsContainer");
const searchInput = document.getElementById("getData");
const supportPageBtn = document.getElementById("supportPageBtn");

function displayDepartments(list = departments) {
  if (!departmentsContainer) return;
  departmentsContainer.innerHTML = "";
  if (!list.length) {
    departmentsContainer.innerHTML = '<div class="emptyProducts"><h3>No departments found</h3><p>Try another search.</p></div>';
    return;
  }
  list.forEach(department => {
    departmentsContainer.innerHTML += `
      <article class="departmentCard">
        <div class="departmentIcon">${department.icon}</div>
        <h2>${department.name}</h2>
        <p>${department.description}</p>
        <div class="departmentHours">${department.hours}</div>
        <div class="departmentPhone">${department.phone}</div>
        <button class="callDepartmentBtn" data-phone="${department.phone}">Call Department</button>
      </article>`;
  });
  document.querySelectorAll(".callDepartmentBtn").forEach(button => {
    button.addEventListener("click", () => {
      const phone = button.dataset.phone;
      if (phone) window.location.href = "tel:" + phone;
    });
  });
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const text = searchInput.value.trim().toLowerCase();
    displayDepartments(departments.filter(item =>
      item.name.toLowerCase().includes(text) || item.description.toLowerCase().includes(text)
    ));
  });
}
if (supportPageBtn) supportPageBtn.addEventListener("click", () => window.location.href = "support.html");
displayDepartments();
