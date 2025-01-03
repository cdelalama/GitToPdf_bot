import { Context } from "grammy";
import { WebAppInitData } from '../utils/webAppSecurity';

export interface SessionData {
    botMessageIds: number[];
    userMessageIds: number[];
}

export interface MyContext extends Context {
    session: SessionData;
}

export interface CustomContext extends Context {
    webAppData?: WebAppInitData;
}

export const initialSession: SessionData = {
    botMessageIds: [],
    userMessageIds: []
}; 