import { launchBrowser, createContext } from '../src/lib/browser.js';
import { runAgentLoop } from '../src/lib/agent-loop.js';
import { PERSONAS } from '../src/lib/personas.js';

async function testAgentLoop() {
  console.log('Testing agent loop...');
  
  const browser = await launchBrowser();
  const context = await createContext(browser);
  const page = await context.newPage();
  
  const persona = PERSONAS[0]; // Speedrun Steve
  const url = 'https://example.com';
  
  console.log(`Running agent for ${persona.name} on ${url}...`);
  
  const steps: any[] = [];
  
  const summary = await runAgentLoop(page, persona, url, (step) => {
    steps.push(step);
    console.log(`Step ${step.stepNumber}: ${step.action.name} - ${step.action.description}`);
  });
  
  console.log('\n--- Summary ---');
  console.log(`Score: ${summary.overallScore}/10`);
  console.log(`Summary: ${summary.summary}`);
  console.log(`Pain Points: ${summary.painPoints.join(', ')}`);
  console.log(`Highlights: ${summary.highlights.join(', ')}`);
  
  await browser.close();
  console.log('\nTest complete!');
}

testAgentLoop().catch(console.error);
