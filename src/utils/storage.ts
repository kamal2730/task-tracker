import type { Task } from "../types";

const STORAGE_KEY = 'task_tracker_tasks';
const THEME_KEY = 'task_tracker_theme'

export const storage = {
    getTasks: ():Task[]=>{
        const data= localStorage.getItem(STORAGE_KEY);
        return data?JSON.parse(data):[];
    },
    saveTasks: (tasks : Task[]) : void =>{
        localStorage.setItem(STORAGE_KEY,JSON.stringify(tasks));
    },
    getTheme:():boolean=>{
        return localStorage.getItem(THEME_KEY) == 'dark';
    },
    saveTheme:(isDark: boolean):void=>{
        localStorage.setItem(THEME_KEY,isDark ?'dark':'light');
    }
}