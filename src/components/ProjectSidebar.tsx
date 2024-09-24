'use client';

import React from 'react';
import { Edit2, Check, Plus, FileText } from 'lucide-react';
import { Project } from '../types';

interface ProjectSidebarProps {
  projects: Project[];
  currentProjectId: string | null;
  editingProjectId: string | null;
  editedProjectName: string;
  onCreateNewProject: () => void;
  onSelectProject: (projectId: string) => void;
  onEditProjectName: (projectId: string, currentName: string) => void;
  onSaveProjectName: (projectId: string) => void;
  setEditedProjectName: (name: string) => void;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  currentProjectId,
  editingProjectId,
  editedProjectName,
  onCreateNewProject,
  onSelectProject,
  onEditProjectName,
  onSaveProjectName,
  setEditedProjectName
}) => {
  return (
    <div className="w-80 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-r border-slate-300 dark:border-slate-600 p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Projects
        </h2>
        <button
          className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow-md transition-all duration-200 flex items-center justify-center gap-2 font-medium"
          onClick={onCreateNewProject}
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>
      
      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border transition-all duration-200 ${
              project.id === currentProjectId 
                ? 'border-blue-400 shadow-md ring-2 ring-blue-100' 
                : 'border-slate-200 dark:border-slate-600 hover:shadow-md'
            }`}
          >
            {editingProjectId === project.id ? (
              <div className="p-4 flex items-center gap-2">
                <input
                  type="text"
                  value={editedProjectName}
                  onChange={(e) => setEditedProjectName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  onClick={() => onSaveProjectName(project.id)}
                  className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                  title="Save Project Name"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="p-4 flex items-center justify-between">
                <button
                  className="flex-1 text-left font-medium text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  onClick={() => onSelectProject(project.id)}
                >
                  {project.name}
                </button>
                <button
                  onClick={() => onEditProjectName(project.id, project.name)}
                  className="p-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                  title="Edit Project Name"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectSidebar;