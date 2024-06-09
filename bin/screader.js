#!/usr/bin/env node

import { watch } from '../lib/screader.js'
import { program } from 'commander'

program
  .option('--reset', 'Reset all configuration')

program.parse()

watch(program.opts())
