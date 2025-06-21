import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

// Load environment variables
require("dotenv").config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function initializeDatabase() {
  try {
    console.log("Initializing database...")

    // Read SQL files
    const schemaSQL = fs.readFileSync(path.join(__dirname, "../db/schema.sql"), "utf8")
    const functionsSQL = fs.readFileSync(path.join(__dirname, "../db/functions.sql"), "utf8")
    const policiesSQL = fs.readFileSync(path.join(__dirname, "../db/policies.sql"), "utf8")
    const triggersSQL = fs.readFileSync(path.join(__dirname, "../db/triggers.sql"), "utf8")

    // Execute schema SQL
    console.log("Creating database schema...")
    const { error: schemaError } = await supabase.rpc("exec_sql", { sql: schemaSQL })
    if (schemaError) {
      throw new Error(`Error creating schema: ${schemaError.message}`)
    }

    // Execute functions SQL
    console.log("Creating database functions...")
    const { error: functionsError } = await supabase.rpc("exec_sql", { sql: functionsSQL })
    if (functionsError) {
      throw new Error(`Error creating functions: ${functionsError.message}`)
    }

    // Execute policies SQL
    console.log("Setting up RLS policies...")
    const { error: policiesError } = await supabase.rpc("exec_sql", { sql: policiesSQL })
    if (policiesError) {
      throw new Error(`Error setting up policies: ${policiesError.message}`)
    }

    // Execute triggers SQL
    console.log("Setting up triggers...")
    const { error: triggersError } = await supabase.rpc("exec_sql", { sql: triggersSQL })
    if (triggersError) {
      throw new Error(`Error setting up triggers: ${triggersError.message}`)
    }

    console.log("Database initialization completed successfully!")
  } catch (error) {
    console.error("Error initializing database:", error)
    process.exit(1)
  }
}

initializeDatabase()
