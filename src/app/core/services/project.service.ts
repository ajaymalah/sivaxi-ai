
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface Project {
  id: string;
  name: string;
  description?: string | null;
}


export interface CreateProjectRequest {
  name: string;
  description?: string;
}


export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}


@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  private readonly http = inject(HttpClient);

  private readonly API_URL = 'http://localhost:8000';


  /**
   * Get all projects
   */
  getProjects(): Observable<Project[]> {

    return this.http.get<Project[]>(
      `${this.API_URL}/projects`
    );

  }


  /**
   * Get one project
   */
  getProject(projectId: string): Observable<Project> {

    return this.http.get<Project>(
      `${this.API_URL}/projects/${projectId}`
    );

  }


  /**
   * Create project
   */
  createProject(
    name: string,
    description = ''
  ): Observable<Project> {

    const request: CreateProjectRequest = {
      name,
      description
    };

    return this.http.post<Project>(
      `${this.API_URL}/projects`,
      request
    );

  }


  /**
   * Update project
   */
  updateProject(
    projectId: string,
    data: UpdateProjectRequest
  ): Observable<Project> {

    return this.http.patch<Project>(
      `${this.API_URL}/projects/${projectId}`,
      data
    );

  }


  /**
   * Delete project
   */
  deleteProject(projectId: string): Observable<void> {

    return this.http.delete<void>(
      `${this.API_URL}/projects/${projectId}`
    );

  }

}

