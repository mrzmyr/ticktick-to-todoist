import toast, { Toaster } from 'react-hot-toast';
import { parse } from 'csv-parse/browser/esm/sync';
import { stringify } from 'csv-stringify/browser/esm/sync';
import _ from 'lodash';
import posthog from 'posthog-js';

import React, { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { NextSeo } from 'next-seo';
import Head from 'next/head';

const TICKTICK_HEADER = ['Folder Name', 'List Name', 'Title', 'Tags', 'Content', 'Is Check list', 'Start Date', 'Due Date', 'Reminder', 'Repeat', 'Priority', 'Status', 'Created Time', 'Completed Time', 'Order', 'Timezone', 'Is All Day', 'Is Floating', 'Column Name', 'Column Order', 'View Mode', 'taskId', 'parentId'];
const TODOIST_HEADER = ['TYPE', 'CONTENT', 'DESCRIPTION', 'PRIORITY', 'INDENT', 'AUTHOR', 'RESPONSIBLE', 'DATE', 'DATE_LANG', 'TIMEZONE']

function Basic(props) {
  const [error, setError] = React.useState(null);
  const [projects, setProjects] = React.useState([]);
  
  const onDrop = useCallback((acceptedFiles) => {
    setError(null)
    
    acceptedFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onabort = () => posthog.capture('file_load_error', { type: 'onabort' })
      reader.onerror = () => posthog.capture('file_load_error', { type: 'onerror' })
      reader.onload = () => {
        const binaryStr = reader.result
        const csvData = parse(binaryStr.toString().split('\n').slice(6).join('\n'));
        const header = csvData[0];
        const data = csvData.slice(1);

        if(!_.isEqual(header, TICKTICK_HEADER)) {
          posthog.capture('file_load_error', { type: 'invalid_header' })
          setError('Invalid CSV file, please provide a tick tick backup file');
          return;
        }

        const tasksPerProject = _.groupBy(data, (row) => row[1]);

        const projects = []
        for(const [projectName, tasks] of Object.entries(tasksPerProject)) {
          const csv = [
            TODOIST_HEADER,
            ...tasks.map((task) => {
              const [folderName, listName, title, tags, content, isCheckList, startDate, dueDate, reminder, repeat, priority, status, createdTime, completedTime, order, timezone, isAllDay, isFloating, columnName, columnOrder, viewMode, taskId, parentId] = task;
              return ['task', title, content, priority, 1, '', '', dueDate, 'en', 'UTC']
            })
          ];
          const project = {
            title: projectName,
            csv: stringify(csv),
            tasks: tasks.map((task) => {
              return {
                title: task[2],
                description: task[4],
                due: task[7],
                priority: task[9],
                status: task[10] + 1,
              }
            })
          }
          projects.push(project);
        }
        
        setProjects(projects);
        posthog.capture('file_load_success')
      }
      reader.readAsText(file);
    })
  }, [])
  
  const {acceptedFiles, getRootProps, getInputProps} = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'text/csv': ['.csv'],
    }
  });

  const [showVideo, setShowVideo] = React.useState(false);

  return (
    <section className="max-w-2xl mx-auto my-8">
      <Head>
        <link rel="icon" type="image/png" href="/images/favicon.png" />
      </Head>
      <NextSeo
        title="Tick Tick to Todoist"
        description="Migrate your tick tick tasks to todoist with a little help from this tool"
        canonical="https://ticktick-to-todoist.vercel.app"
        openGraph={{
          url: 'https://ticktick-to-todoist.vercel.app',
          title: 'Tick Tick to Todoist',
          description: 'Migrate your tick tick tasks to todoist with a little help from this tool',
          images: [
            {
              url: 'https://ticktick-to-todoist.vercel.app/images/header.png',
              width: 800,
              height: 300,
              alt: 'Og Image Alt',
              type: 'image/png',
            },
          ],
          site_name: 'Tick Tick to Todoist',
        }}
      />
      <Toaster />
      <div className='flex justify-center'>
        <img src="/images/header.png" alt="Header" width={800} height={300} />
      </div>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-2'>Tick Tick to Todoist</h1>
        <p className='text-slate-600'>Migrate your tick tick tasks to todoist with a little help from this tool</p>
      </div>
      <details className='mb-4'>
        <summary className='cursor-pointer'>Details</summary>
        <ul className='ml-8 pt-2'>
          <li className='list-disc mb-1'>Task Title is transferred</li>
          <li className='list-disc mb-1'>Task Description is transferred (except media like videos and images)</li>
          <li className='list-disc mb-1'>Task Priority is transferred</li>
          <li className='list-disc mb-1'>Task Due Date is transferred</li>
          <li className='list-disc mb-1'>Task recurrency is not transferred (task itself is transferred)</li>
          <li className='list-disc mb-1'>Projects are transferred</li>
        </ul>
      </details>
      <details className='mb-6'>
        <summary className='cursor-pointer'>How does it work?</summary>
        <div className='mb-8 bg-slate-50 p-6 rounded-lg'>
          <div className='mb-4'>
            <div className='mb-2'>1. Download your TickTick Backup here: <a className='text-blue-600' href="https://ticktick.com/webapp/#settings/backup">https://ticktick.com/webapp/#settings/backup</a></div>
            <div><img className='m-auto' width='90%' src="/images/how-to-1.png" alt="Create Tick Tick Backup"/></div>
          </div>
          <div className='mb-4'>
            <div className='mb-2'>2. Create Projects and Import Tasks to Todoist</div>
            <div>
              <video controls width="90%" className="m-auto">
                <source src="/videos/how-it-works.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </details>
      {error && <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded relative" role="alert">{error}</div>}
      <div {...getRootProps({className: 'dropzone'})} className="bg-slate-50 border border-slate-300 p-4 border-dashed text-slate-500 rounded-lg cursor-pointer">
        <input {...getInputProps()} />
        <p>Drop your TickTick backup csv file here.</p>
      </div>
      {projects.length > 0 && (
      <aside className=''>
        <h4 className='tex-2xl font-bold mt-4 mb-2'>Projects</h4>
        {projects.map((project) => (
          <div key={project.key}>
            {/* copy to clipboard */}
            <div className='grid grid-cols-3 gap-4 items-center mb-2 pb-2 border-b'>
              <div type={'text'} key={project.title} className='flex items-center'>
                  <span>{project.title}</span>
                  <div className='w-7'>
                  <svg onClick={() => {
                    navigator.clipboard.writeText(project.title);
                    toast.success('Copied!');
                    posthog.capture('copy_project_title')
                  }} 
                    className='ml-2 cursor-pointer' xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </div>
              </div>
              <div>
                {project.tasks.length} tasks
              </div>
              <div className='flex justify-end'>
                <button type="button" className="relative inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" 
                  onClick={() => {
                    const a = document.createElement('a') // Create "a" element
                    const blob = new Blob([project.csv], {type: 'csv/text'}) // Create a blob (file-like object)
                    const url = URL.createObjectURL(blob) // Create an object URL from blob
                    a.setAttribute('href', url) // Set "a" element link
                    a.setAttribute('download', `${project.title}.csv`) // Set download filename
                    a.click() // Start downloading
                    posthog.capture('download_csv')
                  }}
                >
                    Download CSV
                </button>
              </div>
            </div>
          </div>
        ))}
      </aside>
      )}
      <div className='mt-8 text-sm text-center text-slate-600'>The data is never transferred to a server and therefore remains private.</div>
      <div className='mt-2 text-sm text-center text-slate-400'>Source Code on <a href="https://github.com/mrzmyr/ticktick-to-todoist" className='underline'>GitHub</a> by <a className='underline' href="https://twitter.com/mrzmyr">@mrzmyr</a></div>
    </section>
  );
}

export default Basic;