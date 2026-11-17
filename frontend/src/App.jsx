import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import CourseDetailPage from './pages/CourseDetailPage';
import CourseFormPage from './pages/CourseFormPage';
import CoursesPage from './pages/CoursesPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MyCoursesPage from './pages/MyCoursesPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';
import UsersPage from './pages/UsersPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public pages */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Any logged-in user */}
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
        </Route>

        {/* Teachers and admins */}
        <Route element={<RequireAuth roles={['teacher', 'admin']} />}>
          <Route path="/courses/new" element={<CourseFormPage />} />
          <Route path="/courses/:id/edit" element={<CourseFormPage />} />
        </Route>

        {/* Students only */}
        <Route element={<RequireAuth roles={['student']} />}>
          <Route path="/my-courses" element={<MyCoursesPage />} />
        </Route>

        {/* Admins only */}
        <Route element={<RequireAuth roles={['admin']} />}>
          <Route path="/users" element={<UsersPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}