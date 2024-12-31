import { Context } from "grammy";

export interface SessionData {
    botMessageIds: number[];
    userMessageIds: number[];
}

export interface MyContext extends Context {
    session: SessionData;
}

export const initialSession: SessionData = {
    botMessageIds: [],
    userMessageIds: []
}; 