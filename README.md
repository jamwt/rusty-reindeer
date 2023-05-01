# Rusty Reindeer

An implementation of Simon Peyton-Jones's Santa-themed concurrency simulation
from his article "Beautiful Concurrency" which originally appeared in the book
_Beautiful Code_ in 2007.

This recreation of the simulation is built using Rust and
[Convex](https://convex.dev). Convex is a backend application platform that
allows you to easily build sophisticated, distributed, reactive apps.

A copy of SPJ's original paper is here:

https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/beautiful.pdf

## From SPJ's paper, the spec

> Santa repeatedly sleeps until wakened by either all of his nine reindeer, back
> from their holidays, or by a group of three of his ten elves. If awakened by
> the reindeer, he harnesses each of them to his sleigh, delivers toys with them
> and finally unharnesses them (allowing them to go off on holiday). If awakened
> by a group of elves, he shows each of the group into his study, consults with
> them on toy R&D and finally shows them each out (allowing them to go back to
> work). Santa should give priority to the reindeer in the case that there is
> both a group of elves and a group of reindeer waiting.

## Example stdout from the paper

    Ho! Ho! Ho! let’s deliver toys
    Reindeer 8 delivering toys
    Reindeer 7 delivering toys
    Reindeer 6 delivering toys
    Reindeer 5 delivering toys
    Reindeer 4 delivering toys
    Reindeer 3 delivering toys
    Reindeer 2 delivering toys
    Reindeer 1 delivering toys
    Reindeer 9 delivering toys
    ----------
    Ho! Ho! Ho! let’s meet in my study
    Elf 3 meeting in the study
    Elf 2 meeting in the study
    Elf 1 meeting in the study
