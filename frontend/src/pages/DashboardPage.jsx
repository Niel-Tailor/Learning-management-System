import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuth } from "../AuthContext";
import CourseCard from "../components/CourseCard";

// Each role only loads the data its dashboard needs.
async function loadDashboard(role) {
  if (role === "student") {
    return { enrollments: await apiRequest("/enrollments/") };
  }
  const courses = await apiRequest("/courses/");
  if (role === "admin") {
    return { courses, users: await apiRequest("/users/") };
  }
  return { courses };
}

function Stat({ label, value }) {
  return (
    <div className="card stat">
      <p className="stat-value">{value}</p>
      <p className="muted">{label}</p>
    </div>
  );
}

function StudentDashboard({ enrollments }) {
  const completed = enrollments.filter((item) => item.completed).length;
  const inProgress = enrollments.filter((item) => !item.completed);
  const percent = enrollments.length ? Math.round((completed / enrollments.length) * 100) : 0;

  return (
    <>
      <div className="stats">
        <Stat label="Courses enrolled" value={enrollments.length} />
        <Stat label="Completed" value={completed} />
        <Stat label="Progress" value={`${percent}%`} />
      </div>

      <div className="dashboard-section">
        <h2>Still in progress</h2>
        {inProgress.length === 0 ? (
          <p className="muted">
            Nothing in progress. <Link to="/courses">Find a new course</Link>
          </p>
        ) : (
          <ul>
            {inProgress.map((item) => (
              <li key={item.id}>
                <Link to={`/courses/${item.course.id}`}>{item.course.title}</Link>
              </li>
            ))}
          </ul>
        )}
        <Link to="/my-courses" className="btn btn-secondary">
          Go to my courses
        </Link>
      </div>
    </>
  );
}

function TeacherDashboard({ courses, userId }) {
  const myCourses = courses.filter((course) => course.teacher === userId);
  const students = myCourses.reduce((total, course) => total + course.enrollment_count, 0);

  return (
    <>
      <div className="stats">
        <Stat label="Your courses" value={myCourses.length} />
        <Stat label="Students enrolled" value={students} />
      </div>

      <div className="dashboard-section">
        <div className="page-header">
          <h2>Your courses</h2>
          <Link to="/courses/new" className="btn">
            New course
          </Link>
        </div>
        {myCourses.length === 0 ? (
          <p className="muted">You haven't created any courses yet.</p>
        ) : (
          <div className="card-grid">
            {myCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function AdminDashboard({ courses, users }) {
  const countRole = (role) => users.filter((user) => user.role === role).length;
  const enrollments = courses.reduce((total, course) => total + course.enrollment_count, 0);
  const popular = courses.reduce(
    (best, course) => (!best || course.enrollment_count > best.enrollment_count ? course : best),
    null,
  );

  return (
    <>
      <div className="stats">
        <Stat label="Students" value={countRole("student")} />
        <Stat label="Teachers" value={countRole("teacher")} />
        <Stat label="Admins" value={countRole("admin")} />
        <Stat label="Courses" value={courses.length} />
        <Stat label="Enrollments" value={enrollments} />
      </div>

      <div className="dashboard-section">
        <h2>Most popular course</h2>
        {popular ? (
          <p>
            <Link to={`/courses/${popular.id}`}>{popular.title}</Link>{" "}
            <span className="muted">({popular.enrollment_count} enrolled)</span>
          </p>
        ) : (
          <p className="muted">No courses yet.</p>
        )}
        <p>
          <Link to="/users" className="btn">
            Manage users
          </Link>{" "}
          <Link to="/courses" className="btn btn-secondary">
            Manage courses
          </Link>
        </p>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    loadDashboard(user.role)
      .then((result) => {
        if (!ignore) setData(result);
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [user.role]);

  return (
    <section>
      <h1>Hello, {user.first_name || user.username}</h1>

      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="muted">Loading your dashboard...</p>}

      {data && user.role === "student" && <StudentDashboard enrollments={data.enrollments} />}
      {data && user.role === "teacher" && (
        <TeacherDashboard courses={data.courses} userId={user.id} />
      )}
      {data && user.role === "admin" && <AdminDashboard courses={data.courses} users={data.users} />}
    </section>
  );
}