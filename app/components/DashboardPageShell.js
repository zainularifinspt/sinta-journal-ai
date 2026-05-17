"use client";

import DashboardLayout from "./DashboardLayout";
import ProtectedPage from "./ProtectedPage";

const allRoles = ["admin", "dosen", "mahasiswa"];

function roleLabel(role) {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Mahasiswa";
}

export default function DashboardPageShell({ title, allowedRoles = allRoles, children }) {
  return (
    <ProtectedPage allowedRoles={allowedRoles}>
      {(profile) => (
        <DashboardLayout
          role={roleLabel(profile.role)}
          title={title}
          userEmail={profile.email}
        >
          {typeof children === "function" ? children(profile) : children}
        </DashboardLayout>
      )}
    </ProtectedPage>
  );
}
