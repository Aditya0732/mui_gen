'use client';

import { useState, useCallback } from 'react';
import { API } from '@/types/api';

interface GenerateComponentRequest {
  prompt: string;
  preferredType?: string;
  options?: {
    theme?: 'light' | 'dark';
    typescript?: boolean;
    accessibility?: boolean;
  };
}

interface GeneratedComponent {
  id: string;
  name: string;
  type: string;
  code: string;
  propsSchema: any;
  examples?: string[];
}

export function useComponentGeneration() {
  const [generatedComponent, setGeneratedComponent] =
    useState<GeneratedComponent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateComponent = useCallback(
    async (request: GenerateComponentRequest) => {
      setIsGenerating(true);
      setError(null);

      try {
        // Step 1: Start generation job
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: request.prompt,
            preferredType: request.preferredType,
            options: request.options,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Generation failed');
        }

        if (!data.success) {
          throw new Error(data.error?.message || 'Generation failed');
        }

        // Step 2: Poll for job completion
        const jobId = data.data.jobId || data.data.component.id; // Get job ID from response
        console.log('Polling for job completion:', jobId);

        const pollJob = async (): Promise<GeneratedComponent> => {
          const jobResponse = await fetch(`/api/jobs/${jobId}`);
          console.log('this is job response', jobResponse);
          const jobData = await jobResponse.json();

          if (!jobResponse.ok) {
            throw new Error(
              jobData.error?.message || 'Job status check failed'
            );
          }

          if (!jobData.success) {
            throw new Error(
              jobData.error?.message || 'Job status check failed'
            );
          }

          const job = jobData.data.job;
          console.log('Job status:', job.status);

          if (job.status === 'COMPLETED' && jobData.data.component) {
            // Job completed successfully
            return jobData.data.component;
          } else if (job.status === 'FAILED') {
            // Job failed
            throw new Error(
              job.error?.message || 'Component generation failed'
            );
          } else {
            // Job still in progress, wait and try again
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            return pollJob(); // Recursive polling
          }
        };

        const component = await pollJob();
        setGeneratedComponent(component);
      } catch (err) {
        console.error('Generation error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const validateComponent = useCallback(
    async (code: string, componentType: string) => {
      try {
        const response = await fetch('/api/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            componentType,
            options: {
              typescript: true,
              accessibility: true,
              security: true,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Validation failed');
        }

        return data.data as API.ValidateResponse;
      } catch (err) {
        console.error('Validation error:', err);
        throw err;
      }
    },
    []
  );

  const saveComponent = useCallback(
    async (component: {
      name: string;
      code: string;
      type: string;
      propsSchema: any;
      description?: string;
      tags?: string[];
      examples?: string[];
    }) => {
      try {
        const response = await fetch('/api/components', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(component),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Save failed');
        }

        return data.data as API.SaveResponse;
      } catch (err) {
        console.error('Save error:', err);
        throw err;
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearComponent = useCallback(() => {
    setGeneratedComponent(null);
    setError(null);
  }, []);

  return {
    generatedComponent,
    isGenerating,
    error,
    generateComponent,
    validateComponent,
    saveComponent,
    clearError,
    clearComponent,
  };
}
