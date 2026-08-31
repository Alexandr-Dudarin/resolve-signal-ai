import { createBrowserRouter } from "react-router-dom";
import { DashboardPage } from "../../pages/dashboard/DashboardPage";
import { FeedbackCreatePage } from "../../pages/feedback-create/FeedbackCreatePage";
import { FeedbackDetailsPage } from "../../pages/feedback-details/FeedbackDetailsPage";
import { FeedbackListPage } from "../../pages/feedback-list/FeedbackListPage";
import { NotFoundPage } from "../../pages/not-found/NotFoundPage";
import { RootLayout } from "./RootLayout";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/feedback", element: <FeedbackListPage /> },
      { path: "/feedback/new", element: <FeedbackCreatePage /> },
      { path: "/feedback/:id", element: <FeedbackDetailsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
