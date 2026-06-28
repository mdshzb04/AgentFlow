"use client";

import { CrmListPage } from "@/components/crm/crm-list-page";
import type { Task } from "@/types/crm";

export default function TasksPage() {
  return (
    <CrmListPage<Task>
      entity="tasks"
      title="Tasks"
      description="Follow-ups and action items"
      fields={[
        { key: "title", label: "Title", required: true },
        { key: "description", label: "Description", type: "textarea" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "pending", label: "Pending" },
            { value: "in_progress", label: "In progress" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ],
        },
        {
          key: "priority",
          label: "Priority",
          type: "select",
          options: [
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ],
        },
        { key: "due_date", label: "Due date", type: "date" },
      ]}
      defaultValues={{ status: "pending", priority: "medium" }}
      renderItem={(task) => ({
        title: task.title,
        subtitle: task.description ?? undefined,
        badges: [task.status, task.priority, task.due_date ?? ""].filter(Boolean),
      })}
      renderDetailFields={(task) => [
        { label: "Description", value: task.description },
        { label: "Status", value: task.status },
        { label: "Priority", value: task.priority },
        { label: "Due date", value: task.due_date },
        { label: "Related type", value: task.related_type },
        { label: "Related record ID", value: task.related_id },
      ]}
    />
  );
}
